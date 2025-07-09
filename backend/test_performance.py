import time
import websockets
import asyncio

async def test_latency():
    async with websockets.connect("ws://localhost:8000/ws") as ws:
        start = time.time()
        await ws.send(b"\x00" * 1024)
        response = await ws.recv()
        latency = (time.time() - start) * 1000
        print(f"Voice-to-Voice Latency: {latency:.2f}ms")
        
async def test_form_tool():
    async with websockets.connect("ws://localhost:8000/ws") as ws:
        # Test form opening
        start = time.time()
        await ws.send("I want to fill a form")
        response = await ws.recv()
        print(f"Form open latency: {(time.time() - start)*1000:.2f}ms")
        
        # Test field update
        start = time.time()
        await ws.send("My name is John Smith")
        response = await ws.recv()
        print(f"Field update latency: {(time.time() - start)*1000:.2f}ms")

if __name__ == "__main__":
    asyncio.run(test_latency())
    asyncio.run(test_form_tool())