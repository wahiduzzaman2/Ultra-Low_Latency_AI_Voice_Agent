import os
import uvicorn
import asyncio
import websockets
from fastapi import FastAPI, WebSocket
from pipecat.pipeline import Pipeline
from pipecat.frames.frames import AudioRawFrame, EndFrame
from pipecat.services.gemini import GeminiLiveAgent
from pipecat.transports.websocket import WebsocketTransport
from form_tool import FormTool
from prometheus_client import Histogram
from prometheus_fastapi_instrumentator import Instrumentator

app = FastAPI()
form_tool = FormTool()

# Instrument Prometheus metrics
instrumentator = Instrumentator()
instrumentator.instrument(app).expose(app)
LATENCY = Histogram('voice_latency_ms', 'Voice-to-voice latency', buckets=[100, 200, 300, 400, 500])

class VoiceAgentTransport(WebsocketTransport):
    def __init__(self, websocket: WebSocket):
        super().__init__(websocket)
        self.agent = GeminiLiveAgent(
            api_key=os.getenv("GEMINI_API_KEY"),
            model="gemini-1.5-flash-latest",
            tools=[form_tool.handle_command],
            low_latency=True
        )
        self.pipeline = Pipeline(
            [self.agent, self],
        )

    async def process_frame(self, frame):
        if isinstance(frame, AudioRawFrame):
            await self.agent.process_frame(frame)
        elif isinstance(frame, EndFrame):
            await self.agent.process_frame(frame)
        else:
            await self._send_websocket_text(str(frame))

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    transport = VoiceAgentTransport(websocket)
    await transport.handle_websocket_connection()
    print("WebSocket connection established")

@app.on_event("startup")
async def startup_event():
    # Pre-warm Gemini connection
    print("Pre-warming Gemini connection...")
    agent = GeminiLiveAgent(api_key=os.getenv("GEMINI_API_KEY"))
    await agent.start()
    await agent.stop()
    print("Gemini pre-warm complete")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)