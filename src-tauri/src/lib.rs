use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatCompletionRequest {
    pub model: String,
    pub messages: Vec<ChatMessage>,
    pub temperature: Option<f32>,
    pub stream: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
struct StreamDelta {
    content: Option<String>,
    reasoning_content: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct StreamChoice {
    delta: StreamDelta,
}

#[derive(Debug, Serialize, Deserialize)]
struct StreamChunk {
    choices: Option<Vec<StreamChoice>>,
}

#[tauri::command]
async fn send_ai_chat_stream(
    app: AppHandle,
    url: String,
    api_key: String,
    mut request: ChatCompletionRequest,
) -> Result<String, String> {
    request.stream = Some(true);

    // No timeout: client will wait until the LLM naturally finishes streaming
    let client = reqwest::Client::builder()
        .build()
        .map_err(|e| format!("Client build error: {}", e))?;

    let mut req_builder = client
        .post(&url)
        .header("Content-Type", "application/json");

    if !api_key.trim().is_empty() {
        req_builder = req_builder.header("Authorization", format!("Bearer {}", api_key.trim()));
    }

    let res = req_builder
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("无法连接至 AI 服务: {}", e))?;

    if !res.status().is_success() {
        let status = res.status();
        let err_body = res.text().await.unwrap_or_default();
        return Err(format!("AI 接口返回错误 [{}]: {}", status, err_body));
    }

    let mut stream = res.bytes_stream();
    let mut accumulated_full_text = String::new();
    let mut buffer = String::new();

    while let Some(chunk_res) = stream.next().await {
        let chunk = chunk_res.map_err(|e| format!("读取流数据失败: {}", e))?;
        let text = String::from_utf8_lossy(&chunk);
        buffer.push_str(&text);

        while let Some(pos) = buffer.find('\n') {
            let line = buffer[..pos].trim().to_string();
            buffer = buffer[pos + 1..].to_string();

            if line.is_empty() || line.starts_with(':') {
                continue;
            }

            if line.starts_with("data: ") {
                let data_str = &line[6..].trim();
                if *data_str == "[DONE]" {
                    break;
                }

                if let Ok(parsed) = serde_json::from_str::<StreamChunk>(data_str) {
                    if let Some(choices) = parsed.choices {
                        if let Some(first) = choices.first() {
                            if let Some(content) = &first.delta.content {
                                accumulated_full_text.push_str(content);
                                let _ = app.emit("ai-stream-chunk", content);
                            } else if let Some(reasoning) = &first.delta.reasoning_content {
                                // Support DeepSeek-R1 reasoning stream
                                let _ = app.emit("ai-stream-chunk", reasoning);
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(accumulated_full_text)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![send_ai_chat_stream])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
