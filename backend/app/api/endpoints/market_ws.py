"""
WebSocket endpoints for real-time market data streaming
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from typing import List, Optional
import json

from app.utils.market_data_streamer import get_market_streamer

router = APIRouter()


@router.websocket("/ws/market-data")
async def websocket_market_data(
    websocket: WebSocket,
    token: Optional[str] = Query(None)
):
    """
    WebSocket endpoint for real-time market data streaming
    
    Client sends:
    - {"action": "subscribe", "tickers": ["AAPL", "GOOGL"]}
    - {"action": "unsubscribe", "tickers": ["AAPL"]}
    - {"action": "ping"}
    
    Server sends:
    - {"type": "price_update", "ticker": "AAPL", "data": {...}}
    - {"type": "pong"}
    - {"type": "error", "message": "..."}
    """
    await websocket.accept()
    
    streamer = get_market_streamer()
    subscribed_tickers = set()
    
    # Start streamer if not running
    if not streamer.is_running:
        await streamer.start()
    
    try:
        # Send connection confirmation
        await websocket.send_json({
            "type": "connected",
            "message": "Connected to market data stream"
        })
        
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                action = message.get("action")
                
                if action == "subscribe":
                    tickers = message.get("tickers", [])
                    
                    for ticker in tickers:
                        ticker = ticker.upper()
                        await streamer.subscribe(websocket, ticker)
                        subscribed_tickers.add(ticker)
                    
                    await websocket.send_json({
                        "type": "subscribed",
                        "tickers": list(subscribed_tickers)
                    })
                
                elif action == "unsubscribe":
                    tickers = message.get("tickers", [])
                    
                    for ticker in tickers:
                        ticker = ticker.upper()
                        await streamer.unsubscribe(websocket, ticker)
                        subscribed_tickers.discard(ticker)
                    
                    await websocket.send_json({
                        "type": "unsubscribed",
                        "tickers": tickers
                    })
                
                elif action == "ping":
                    await websocket.send_json({"type": "pong"})
                
                else:
                    await websocket.send_json({
                        "type": "error",
                        "message": f"Unknown action: {action}"
                    })
            
            except json.JSONDecodeError:
                await websocket.send_json({
                    "type": "error",
                    "message": "Invalid JSON message"
                })
            except Exception as e:
                await websocket.send_json({
                    "type": "error",
                    "message": str(e)
                })
    
    except WebSocketDisconnect:
        # Clean up subscriptions when client disconnects
        await streamer.unsubscribe_all(websocket)
    
    except Exception as e:
        print(f"WebSocket error: {e}")
        try:
            await websocket.close()
        except:
            pass
        finally:
            await streamer.unsubscribe_all(websocket)


@router.get("/market-data/status")
async def get_streaming_status():
    """Get real-time streaming service status"""
    streamer = get_market_streamer()
    return streamer.get_stats()