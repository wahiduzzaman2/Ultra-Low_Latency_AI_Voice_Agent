import { useState, useRef, useEffect } from 'react';

export default function VoiceAgent() {
  const [isListening, setIsListening] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [latency, setLatency] = useState(0);
  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const processorRef = useRef(null);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (processorRef.current) {
        processorRef.current.disconnect();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const startConversation = async () => {
    try {
      console.log("Initializing audio context...");
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      console.log("Creating WebSocket connection...");
      wsRef.current = new WebSocket('ws://localhost:8000/ws');
      
      wsRef.current.onopen = async () => {
        console.log("WebSocket connected");
        try {
          console.log("Requesting microphone access...");
          const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
              sampleRate: 16000,
              channelCount: 1,
              echoCancellation: true,
              noiseSuppression: true
            }
          });
          mediaStreamRef.current = stream;
          
          console.log("Creating audio processor...");
          const source = audioContext.createMediaStreamSource(stream);
          const processor = audioContext.createScriptProcessor(1024, 1, 1);
          processorRef.current = processor;
          
          source.connect(processor);
          processor.connect(audioContext.destination);
          
          processor.onaudioprocess = (e) => {
            if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
              return;
            }
            
            const audioData = e.inputBuffer.getChannelData(0);
            wsRef.current.send(audioData.buffer);
          };
          
          setIsListening(true);
          console.log("Audio processing started");
        } catch (err) {
          console.error('Microphone error:', err);
          alert(`Microphone error: ${err.message}`);
        }
      };
      
      wsRef.current.onmessage = async (event) => {
        const startTime = performance.now();
        
        if (typeof event.data === 'string') {
          try {
            console.log("Received text message:", event.data);
            const message = JSON.parse(event.data);
            handleAgentResponse(message);
          } catch (err) {
            console.error('JSON parse error:', err);
          }
        } else {
          try {
            const audioData = await audioContextRef.current.decodeAudioData(event.data);
            playAudio(audioData);
            const endTime = performance.now();
            setLatency(Math.round(endTime - startTime));
          } catch (err) {
            console.error('Audio decode error:', err);
          }
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      wsRef.current.onclose = () => {
        console.log("WebSocket closed");
        setIsListening(false);
        if (processorRef.current) {
          processorRef.current.disconnect();
        }
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
      };
    } catch (err) {
      console.error('Initialization error:', err);
      alert(`Initialization error: ${err.message}`);
    }
  };

  const playAudio = (audioBuffer) => {
    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);
    source.start();
  };

  const handleAgentResponse = (response) => {
    console.log("Handling agent response:", response);
    if (response.action === 'open_form') {
      setFormOpen(true);
    } else if (response.action === 'update_field') {
      setFormData(prev => ({ ...prev, [response.field]: response.value }));
    } else if (response.action === 'submit_form') {
      setFormOpen(false);
      alert(`Form submitted!\nName: ${response.data.name}\nEmail: ${response.data.email}`);
    }
  };

  const stopConversation = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    setIsListening(false);
  };

  return (
    <div className="container">
      <h1>Ultra-Low Latency Voice Agent</h1>
      
      <div className="controls">
        <button 
          onClick={startConversation} 
          disabled={isListening}
          className="button"
        >
          Start Conversation
        </button>
        <button 
          onClick={stopConversation} 
          disabled={!isListening}
          className="button"
        >
          Stop Conversation
        </button>
      </div>
      
      <div className="latency">
        Voice-to-Voice Latency: <strong>{latency}ms</strong>
        {latency > 500 && <span className="warning"> (Above Target!)</span>}
      </div>
      
      {formOpen && (
        <div className="form">
          <h2>User Information Form</h2>
          <div className="form-field">
            <label>Name:</label>
            <input type="text" value={formData.name} readOnly />
          </div>
          <div className="form-field">
            <label>Email:</label>
            <input type="email" value={formData.email} readOnly />
          </div>
          <p className="instruction">Say "Submit the form" when finished</p>
        </div>
      )}
      
      <style jsx>{`
        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          margin-top: 2rem;
        }
        .controls {
          display: flex;
          gap: 1rem;
          margin: 2rem 0;
        }
        .button {
          padding: 0.8rem 1.5rem;
          background: #0070f3;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1rem;
          transition: background 0.2s;
        }
        .button:hover {
          background: #005bb5;
        }
        .button:disabled {
          background: #cccccc;
          cursor: not-allowed;
        }
        .latency {
          margin: 1.5rem 0;
          font-size: 1.2rem;
          padding: 0.8rem;
          background: #f8f9fa;
          border-radius: 4px;
        }
        .warning {
          color: #e53935;
          margin-left: 10px;
          font-weight: bold;
        }
        .form {
          margin-top: 2rem;
          padding: 1.5rem;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          background: #fafafa;
        }
        .form h2 {
          margin-top: 0;
        }
        .form-field {
          margin: 1.2rem 0;
          display: flex;
          align-items: center;
        }
        label {
          display: inline-block;
          width: 80px;
          font-weight: 500;
        }
        input {
          padding: 0.7rem;
          width: 300px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 1rem;
        }
        .instruction {
          font-style: italic;
          color: #666;
        }
      `}</style>
    </div>
  );
}