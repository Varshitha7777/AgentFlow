# AgentFlow - Intelligent Multi-Tool AI Assistant

An advanced browser-based AI agent that uses multiple tools in a reasoning loop to accomplish complex tasks intelligently.

## Features

- **Multi-LLM Support**: OpenAI, Anthropic, and Google models
- **Intelligent Tool Integration**:
  - Google Search API for real-time web information retrieval
  - AI Pipe API for flexible data workflows and processing
  - JavaScript Code Execution (secure browser-based execution)
- **Smart Reasoning Loop**: Continues executing tools until the task is complete
- **Professional UI**: Modern, responsive interface with comprehensive error handling

## Setup

1. Open `index.html` in a modern web browser
2. Configure your API keys:
   - **LLM Provider API Key**: OpenAI, Anthropic, or Google
   - **Google Search API Key**: For web search functionality
   - **Search Engine ID**: Custom search engine ID from Google

### Getting API Keys

#### OpenAI API Key
1. Visit [OpenAI API](https://platform.openai.com/api-keys)
2. Create a new API key
3. Copy and paste into the configuration

#### Google Search API
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the Custom Search JSON API
3. Create credentials (API key)
4. Set up a Custom Search Engine at [Custom Search](https://cse.google.com/)

#### Anthropic API Key
1. Visit [Anthropic Console](https://console.anthropic.com/)
2. Generate an API key
3. Use with Claude models

## Usage Examples

### Example 1: Research Assistant
```
User: "Research the latest developments in quantum computing and create a summary"
```
The agent will:
1. Search for quantum computing information
2. Analyze and summarize findings
3. Present structured results

### Example 2: Data Analysis
```
User: "Generate some random data and calculate statistics"
```
The agent will:
1. Execute JavaScript to generate data
2. Calculate statistical measures
3. Display results with visualizations

### Example 3: Interview Bot
```
User: "Interview me to create a blog post about IBM"
```
The agent will:
1. Search for IBM information
2. Ask relevant questions
3. Structure responses into blog format

## Tool Capabilities

### 🔍 Google Search
- Retrieves relevant web snippets
- Configurable number of results
- Real-time information access

### 🤖 AI Pipe API
- Simulated AI workflows (extendable)
- Text summarization
- Sentiment analysis
- Keyword extraction
- Translation services

### 💻 JavaScript Execution
- Safe browser-based code execution
- Console output capture
- Result display with syntax highlighting
- Access to demo utility functions

## Architecture

### Core Agent Loop
```javascript
async agentLoop() {
    while (true) {
        const response = await this.callLLM();
        
        if (response.content) {
            this.addMessage('agent', response.content);
        }

        if (response.tool_calls && response.tool_calls.length > 0) {
            // Execute tools and continue loop
            const toolResults = await Promise.all(
                response.tool_calls.map(tc => this.handleToolCall(tc))
            );
            // Add results to conversation and continue
        } else {
            // No more tools needed, wait for user input
            break;
        }
    }
}
```

### Tool Calling Interface
Uses OpenAI's function calling format:
```json
{
  "type": "function",
  "function": {
    "name": "google_search",
    "description": "Search Google for information",
    "parameters": {
      "type": "object",
      "properties": {
        "query": {"type": "string"},
        "num_results": {"type": "integer"}
      }
    }
  }
}
```

## Demo JavaScript Functions

The agent has access to several utility functions:

```javascript
// Calculate Fibonacci numbers
demoFunctions.fibonacci(10)

// Check if number is prime
demoFunctions.isPrime(17)

// Generate random data
demoFunctions.generateRandomData(10)
```

## Error Handling

- **Bootstrap Alerts**: User-friendly error messages
- **API Error Recovery**: Graceful handling of API failures
- **Input Validation**: Prevents invalid operations
- **Safe Code Execution**: Sandboxed JavaScript execution

## Browser Compatibility

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Security Considerations

- API keys stored in browser session only
- JavaScript execution is sandboxed to browser context
- No server-side code execution
- CORS policies apply to external API calls

## Extension Ideas

1. **File Upload**: Allow document analysis
2. **Image Generation**: Integrate DALL-E or similar
3. **Voice Interface**: Add speech-to-text input
4. **Export Features**: Save conversations as PDF/Markdown
5. **Plugin System**: Extensible tool architecture
6. **Local Storage**: Persist conversations and settings

## Troubleshooting

### Common Issues

**"Please provide an API key"**
- Ensure you've entered your LLM provider API key

**"Google Search API error"**
- Verify Google Search API key and Search Engine ID
- Check API quotas and billing

**"CORS Error"**
- Some APIs may require proxy setup for browser use
- Consider deploying with a simple backend proxy

**"Tool execution failed"**
- Check JavaScript syntax in code execution
- Verify network connectivity for external APIs

## License

MIT License - Feel free to modify and extend!

## Creator

**AgentFlow** was created by **Sanket Mishra** - An intelligent multi-tool AI assistant designed to showcase the power of browser-based agent reasoning and workflow automation.
