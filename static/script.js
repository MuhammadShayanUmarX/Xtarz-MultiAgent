// Xtarz AI Agents Frontend JavaScript
class VMNebulaApp {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.messageCount = 0;
        this.totalTokens = 0;
        this.responseTimes = [];
        this.isStreaming = true;
        this.currentEventSource = null;
        
        this.initializeElements();
        this.bindEvents();
        this.loadModelStatus();
    }
    
    initializeElements() {
        this.elements = {
            messageInput: document.getElementById('messageInput'),
            sendBtn: document.getElementById('sendBtn'),
            chatMessages: document.getElementById('chatMessages'),
            streamToggle: document.getElementById('streamToggle'),
            modelStatusBtn: document.getElementById('modelStatusBtn'),
            historyBtn: document.getElementById('historyBtn'),
            clearBtn: document.getElementById('clearBtn'),
            loadingOverlay: document.getElementById('loadingOverlay'),
            messageCount: document.getElementById('messageCount'),
            avgResponseTime: document.getElementById('avgResponseTime'),
            totalTokens: document.getElementById('totalTokens'),
            currentAgent: document.getElementById('currentAgent'),
            currentModel: document.getElementById('currentModel'),
            toastContainer: document.getElementById('toastContainer')
        };
    }
    
    bindEvents() {
        // Send message events
        this.elements.sendBtn.addEventListener('click', () => this.sendMessage());
        this.elements.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Auto-resize textarea
        this.elements.messageInput.addEventListener('input', () => {
            this.elements.messageInput.style.height = 'auto';
            this.elements.messageInput.style.height = this.elements.messageInput.scrollHeight + 'px';
        });
        
        // Stream toggle
        this.elements.streamToggle.addEventListener('click', () => this.toggleStreaming());
        
        // Header buttons
        this.elements.modelStatusBtn.addEventListener('click', () => this.showModelStatus());
        this.elements.historyBtn.addEventListener('click', () => this.showHistory());
        this.elements.clearBtn.addEventListener('click', () => this.clearChat());
        
        // Modal events
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModals();
            }
            if (e.target.classList.contains('close-btn')) {
                this.closeModals();
            }
        });
        
        // Escape key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModals();
            }
        });
    }
    
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    async sendMessage() {
        const message = this.elements.messageInput.value.trim();
        if (!message) return;
        
        // Clear input and disable send button
        this.elements.messageInput.value = '';
        this.elements.messageInput.style.height = 'auto';
        this.elements.sendBtn.disabled = true;
        
        // Add user message to chat
        this.addMessage(message, 'user');
        
        // Remove welcome message if exists
        const welcomeMessage = this.elements.chatMessages.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }
        
        if (this.isStreaming) {
            await this.sendStreamingMessage(message);
        } else {
            await this.sendRegularMessage(message);
        }
        
        this.elements.sendBtn.disabled = false;
    }
    
    async sendRegularMessage(message) {
        this.showLoading();
        
        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: message,
                    session_id: this.sessionId
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            // Update agent and model info
            this.updateAgentInfo(data.agent_used, data.model);
            
            // Add assistant response
            this.addMessage(data.response, 'assistant', {
                agent: data.agent_used,
                model: data.model,
                confidence: data.confidence,
                processingTime: data.processing_time,
                tokenCount: data.token_count
            });
            
            // Update stats
            this.updateStats(data.processing_time, data.token_count);
            
        } catch (error) {
            console.error('Error:', error);
            this.addMessage('Sorry, I encountered an error. Please try again.', 'assistant', {
                agent: 'System',
                model: 'Error',
                isError: true
            });
            this.showToast('Connection error occurred', 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    async sendStreamingMessage(message) {
        const messageElement = this.addMessage('', 'assistant', {
            agent: 'Connecting...',
            model: 'Loading...',
            isStreaming: true
        });
        
        const contentElement = messageElement.querySelector('.message-content');
        
        try {
            this.currentEventSource = new EventSource('/chat/stream');
            
            // Send the actual request
            fetch('/chat/stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: message,
                    session_id: this.sessionId
                })
            });
            
            let fullResponse = '';
            let startTime = Date.now();
            
            this.currentEventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    switch (data.event) {
                        case 'start':
                            this.updateAgentInfo(data.agent, data.model);
                            messageElement.querySelector('.message-sender').textContent = data.agent;
                            messageElement.querySelector('.message-meta').textContent = `${data.model} • Streaming...`;
                            break;
                            
                        case 'delta':
                            fullResponse += data.content + ' ';
                            contentElement.textContent = fullResponse;
                            this.scrollToBottom();
                            break;
                            
                        case 'complete':
                            const endTime = Date.now();
                            const processingTime = (endTime - startTime) / 1000;
                            const tokenCount = fullResponse.split(' ').length;
                            
                            messageElement.querySelector('.message-meta').textContent = 
                                `${messageElement.querySelector('.message-meta').textContent.split(' • ')[0]} • ${processingTime.toFixed(2)}s • ${tokenCount} tokens`;
                            
                            this.updateStats(processingTime, tokenCount);
                            this.currentEventSource.close();
                            this.currentEventSource = null;
                            break;
                            
                        case 'error':
                            contentElement.textContent = `Error: ${data.message}`;
                            messageElement.classList.add('error-message');
                            this.currentEventSource.close();
                            this.currentEventSource = null;
                            this.showToast('Streaming error occurred', 'error');
                            break;
                    }
                } catch (error) {
                    console.error('Error parsing SSE data:', error);
                }
            };
            
            this.currentEventSource.onerror = (error) => {
                console.error('SSE Error:', error);
                if (this.currentEventSource) {
                    this.currentEventSource.close();
                    this.currentEventSource = null;
                }
                contentElement.textContent = 'Connection error occurred during streaming.';
                messageElement.classList.add('error-message');
                this.showToast('Streaming connection failed', 'error');
            };
            
        } catch (error) {
            console.error('Streaming error:', error);
            contentElement.textContent = 'Failed to establish streaming connection.';
            messageElement.classList.add('error-message');
            this.showToast('Failed to start streaming', 'error');
        }
    }
    
    addMessage(content, sender, metadata = {}) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const agentIcons = {
            'Code Assistant': '💻',
            'Research Assistant': '🔍', 
            'Task Helper': '📝',
            'General Assistant': '💬'
        };
        
        const icon = sender === 'user' ? '👤' : (agentIcons[metadata.agent] || '🤖');
        
        messageDiv.innerHTML = `
            <div class="message-header">
                <div class="message-avatar ${sender}-avatar">${icon}</div>
                <div class="message-info">
                    <div class="message-sender">${sender === 'user' ? 'You' : (metadata.agent || 'Assistant')}</div>
                    <div class="message-meta">${this.formatMetadata(metadata)}</div>
                </div>
            </div>
            <div class="message-content">${this.formatContent(content)}</div>
        `;
        
        this.elements.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
        
        return messageDiv;
    }
    
    formatMetadata(metadata) {
        if (!metadata || Object.keys(metadata).length === 0) {
            return new Date().toLocaleTimeString();
        }
        
        let meta = new Date().toLocaleTimeString();
        
        if (metadata.model && !metadata.isStreaming) {
            meta += ` • ${metadata.model}`;
        }
        
        if (metadata.processingTime) {
            meta += ` • ${metadata.processingTime.toFixed(2)}s`;
        }
        
        if (metadata.tokenCount) {
            meta += ` • ${metadata.tokenCount} tokens`;
        }
        
        if (metadata.confidence) {
            meta += ` • ${(metadata.confidence * 100).toFixed(0)}% confidence`;
        }
        
        return meta;
    }
    
    formatContent(content) {
        // Basic markdown-like formatting
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
    }
    
    updateAgentInfo(agent, model) {
        const agentIcons = {
            'Code Assistant': '💻',
            'Research Assistant': '🔍',
            'Task Helper': '📝',
            'General Assistant': '💬'
        };
        
        const agentDescriptions = {
            'Code Assistant': 'Specialized in programming and debugging',
            'Research Assistant': 'Expert in analysis and investigation',
            'Task Helper': 'Provides step-by-step guidance',
            'General Assistant': 'Handles general questions and conversations'
        };
        
        this.elements.currentAgent.innerHTML = `
            <div class="agent-icon">${agentIcons[agent] || '🤖'}</div>
            <div class="agent-info">
                <span class="agent-name">${agent}</span>
                <span class="agent-desc">${agentDescriptions[agent] || 'AI Assistant'}</span>
            </div>
        `;
        
        const modelProviders = {
            'gemini-1.5-flash': 'Google Gemini',
            'gemini-1.5-flash-8b': 'Google Gemini (Fast)',
            'deepseeker-1.0': 'DeepSeek AI'
        };
        
        this.elements.currentModel.innerHTML = `
            <div class="model-name">${model}</div>
            <div class="model-provider">${modelProviders[model] || 'AI Model'}</div>
        `;
    }
    
    updateStats(processingTime, tokenCount) {
        this.messageCount++;
        this.totalTokens += tokenCount;
        this.responseTimes.push(processingTime);
        
        const avgTime = this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;
        
        this.elements.messageCount.textContent = this.messageCount;
        this.elements.avgResponseTime.textContent = avgTime.toFixed(2) + 's';
        this.elements.totalTokens.textContent = this.totalTokens.toLocaleString();
    }
    
    toggleStreaming() {
        this.isStreaming = !this.isStreaming;
        this.elements.streamToggle.classList.toggle('active', this.isStreaming);
        
        if (this.currentEventSource) {
            this.currentEventSource.close();
            this.currentEventSource = null;
        }
        
        this.showToast(`Streaming ${this.isStreaming ? 'enabled' : 'disabled'}`, 'success');
    }
    
    async showModelStatus() {
        const modal = document.getElementById('modelModal');
        const content = document.getElementById('modelStatusContent');
        
        modal.classList.add('active');
        content.innerHTML = '<div class="loading">Loading model status...</div>';
        
        try {
            const response = await fetch('/models/status');
            const data = await response.json();
            
            let html = `
                <div class="model-status-info">
                    <p><strong>Available Models:</strong> ${data.count}</p>
                    <p><strong>Last Updated:</strong> ${new Date(data.time).toLocaleString()}</p>
                </div>
                <div class="models-list">
            `;
            
            data.models.forEach(model => {
                html += `
                    <div class="model-item">
                        <div class="model-details">
                            <strong>${model.model}</strong>
                            <span class="model-provider">${model.provider}</span>
                        </div>
                        <div class="model-status ${model.status}">
                            ${model.status === 'available' ? '✅' : '❌'} ${model.status}
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
            content.innerHTML = html;
            
        } catch (error) {
            content.innerHTML = `<div class="error">Failed to load model status: ${error.message}</div>`;
        }
    }
    
    async showHistory() {
        const modal = document.getElementById('historyModal');
        const content = document.getElementById('historyContent');
        
        modal.classList.add('active');
        content.innerHTML = '<div class="loading">Loading chat history...</div>';
        
        try {
            const response = await fetch('/chat/history?limit=20');
            const data = await response.json();
            
            if (data.success && data.history.length > 0) {
                let html = `<div class="history-stats"><p><strong>Recent ${data.count} conversations</strong></p></div>`;
                
                data.history.forEach(chat => {
                    html += `
                        <div class="history-item">
                            <div class="history-header">
                                <strong>${chat.agent_used}</strong>
                                <span class="history-model">${chat.model}</span>
                                <span class="history-time">${new Date(chat.created_at).toLocaleString()}</span>
                            </div>
                            <div class="history-query"><strong>Q:</strong> ${chat.query}</div>
                            <div class="history-response"><strong>A:</strong> ${chat.response.substring(0, 200)}${chat.response.length > 200 ? '...' : ''}</div>
                            <div class="history-stats">
                                ${chat.processing_time.toFixed(2)}s • ${chat.token_count} tokens • ${(chat.confidence * 100).toFixed(0)}% confidence
                            </div>
                        </div>
                    `;
                });
                
                content.innerHTML = html;
            } else {
                content.innerHTML = '<div class="no-data">No chat history found.</div>';
            }
            
        } catch (error) {
            content.innerHTML = `<div class="error">Failed to load history: ${error.message}</div>`;
        }
    }
    
    clearChat() {
        if (confirm('Are you sure you want to clear the chat?')) {
            this.elements.chatMessages.innerHTML = `
                <div class="welcome-message">
                    <div class="welcome-icon">🚀</div>
                    <h2>Welcome to Xtarz AI Agents</h2>
                    <p>Your intelligent multi-agent AI assistant is ready to help!</p>
                    <div class="welcome-features">
                        <div class="feature">
                            <i class="fas fa-brain"></i>
                            <span>Smart Agent Detection</span>
                        </div>
                        <div class="feature">
                            <i class="fas fa-lightning-bolt"></i>
                            <span>Real-time Streaming</span>
                        </div>
                        <div class="feature">
                            <i class="fas fa-cogs"></i>
                            <span>Optimized Model Selection</span>
                        </div>
                    </div>
                </div>
            `;
            
            // Reset stats
            this.messageCount = 0;
            this.totalTokens = 0;
            this.responseTimes = [];
            this.updateStatsDisplay();
            
            this.showToast('Chat cleared', 'success');
        }
    }
    
    updateStatsDisplay() {
        this.elements.messageCount.textContent = this.messageCount;
        this.elements.avgResponseTime.textContent = this.responseTimes.length > 0 ? 
            (this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length).toFixed(2) + 's' : '-';
        this.elements.totalTokens.textContent = this.totalTokens.toLocaleString();
    }
    
    closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }
    
    showLoading() {
        this.elements.loadingOverlay.classList.remove('hidden');
    }
    
    hideLoading() {
        this.elements.loadingOverlay.classList.add('hidden');
    }
    
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        this.elements.toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
    
    scrollToBottom() {
        this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
    }
    
    async loadModelStatus() {
        try {
            const response = await fetch('/models/status');
            const data = await response.json();
            
            if (data.count === 0) {
                this.showToast('No AI models are currently available. Please check your API keys.', 'warning');
            }
        } catch (error) {
            console.error('Failed to load initial model status:', error);
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new VMNebulaApp();
});

// Add some additional CSS for history and model status
const additionalCSS = `
.model-status-info {
    background: #f8f9fa;
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1rem;
}

.models-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.model-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border: 1px solid #e9ecef;
    border-radius: 8px;
}

.model-provider {
    font-size: 0.85rem;
    color: #666;
    margin-left: 0.5rem;
}

.model-status {
    font-weight: 600;
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.85rem;
}

.model-status.available {
    background: #d4edda;
    color: #155724;
}

.history-item {
    border: 1px solid #e9ecef;
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1rem;
}

.history-header {
    display: flex;
    gap: 1rem;
    align-items: center;
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
}

.history-model {
    background: #e9ecef;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
}

.history-time {
    color: #666;
    font-size: 0.75rem;
    margin-left: auto;
}

.history-query, .history-response {
    margin: 0.5rem 0;
    font-size: 0.9rem;
    line-height: 1.4;
}

.history-stats {
    font-size: 0.75rem;
    color: #666;
    margin-top: 0.5rem;
}

.error-message .message-content {
    background: #f8d7da !important;
    color: #721c24 !important;
    border-left: 4px solid #dc3545;
}

.no-data, .error {
    text-align: center;
    padding: 2rem;
    color: #666;
}

.error {
    color: #dc3545;
}
`;

// Inject additional CSS
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalCSS;
document.head.appendChild(styleSheet);
