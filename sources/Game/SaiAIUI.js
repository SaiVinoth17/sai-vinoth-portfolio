import { Game } from './Game.js'
import { SaiAIEngine } from './SaiAIEngine.js'
import { SaiAIAnalytics } from './SaiAIAnalytics.js'

export class SaiAIUI
{
    constructor()
    {
        this.game = Game.getInstance()
        this.engine = new SaiAIEngine()
        this.isOpen = false

        this.triggerElement = document.querySelector('.js-sai-ai-trigger')
        this.modalElement = document.querySelector('.js-sai-ai-modal')

        if(!this.triggerElement || !this.modalElement)
        {
            return
        }

        this.closeElement = this.modalElement.querySelector('.js-sai-ai-close')
        this.messagesElement = this.modalElement.querySelector('.js-sai-ai-messages')
        this.inputElement = this.modalElement.querySelector('.js-sai-ai-input')
        this.submitElement = this.modalElement.querySelector('.js-sai-ai-submit')
        this.subtitleElement = this.modalElement.querySelector('.subtitle')

        this.setEvents()
    }

    setEvents()
    {
        // Toggle trigger click
        this.triggerElement.addEventListener('click', (e) => {
            e.preventDefault()
            this.toggle()
        })

        // Close button click
        if(this.closeElement) {
            this.closeElement.addEventListener('click', (e) => {
                e.preventDefault()
                this.close()
            })
        }

        // Submit message click
        if(this.submitElement) {
            this.submitElement.addEventListener('click', (e) => {
                e.preventDefault()
                this.submit()
            })
        }

        // Input keydown (Enter to send)
        if(this.inputElement) {
            this.inputElement.addEventListener('keydown', (e) => {
                if(e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    this.submit()
                }
            })
        }

        // ESC key to close
        window.addEventListener('keydown', (e) => {
            if(e.key === 'Escape' && this.isOpen) {
                this.close()
            }
        })

        // Delegation for pills and CTA buttons
        this.messagesElement.addEventListener('click', (e) => {
            const pill = e.target.closest('.js-suggestion-pill')
            if(pill) {
                const query = pill.dataset.query || pill.textContent
                this.inputElement.value = query
                this.submit()
                return
            }

            const actionBtn = e.target.closest('.js-action-btn')
            if(actionBtn) {
                const type = actionBtn.dataset.type
                const target = actionBtn.dataset.target
                if(type === 'navigate') {
                    if(target === 'projects') this.engine.getTools().showProjects()
                    else if(target === 'about') this.engine.getTools().showSkills()
                    else if(target === 'contact') this.engine.getTools().showContact()
                    else this.engine.getTools().showContact()
                    SaiAIAnalytics.trackEvent('section_navigated_from_ai', { section: target })
                } else if(type === 'url') {
                    this.engine.getTools().openProject(target)
                    SaiAIAnalytics.trackEvent('project_clicked_from_ai', { url: target })
                }
            }
        })
    }

    toggle()
    {
        if(this.isOpen) this.close()
        else this.open()
    }

    open()
    {
        if(this.isOpen) return
        this.isOpen = true

        const clickSound = this.game.audio.groups.get('click')
        if(clickSound) clickSound.play(true)

        this.modalElement.classList.add('is-visible')
        SaiAIAnalytics.trackEvent('ai_opened')

        if(this.inputElement) {
            setTimeout(() => {
                this.inputElement.focus()
            }, 300)
        }
    }

    close()
    {
        if(!this.isOpen) return
        this.isOpen = false

        const clickSound = this.game.audio.groups.get('click')
        if(clickSound) clickSound.play(false)

        this.modalElement.classList.remove('is-visible')
        SaiAIAnalytics.trackEvent('ai_closed')
    }

    async submit()
    {
        const text = this.inputElement.value.trim()
        if(!text) return

        if(text.length > 500) {
            this.appendAssistantMessage("Please keep your message under 500 characters.")
            return
        }

        this.inputElement.value = ''

        // Render user message
        this.appendUserMessage(text)

        // Dynamic status text
        let statusMsg = 'Thinking...'
        if(text.toLowerCase().includes('project') || text.toLowerCase().includes('work')) statusMsg = "Exploring Sai's projects..."
        else if(text.toLowerCase().includes('hire') || text.toLowerCase().includes('build')) statusMsg = "Gathering requirements..."
        else if(text.toLowerCase().includes('hotel') || text.toLowerCase().includes('tourism') || text.toLowerCase().includes('shop')) statusMsg = "Finding the best match..."

        this.updateSubtitle(statusMsg)
        const thinkingEl = this.appendThinking(statusMsg)
        this.scrollToBottom()

        let assistantMessageRow = null

        try {
            const result = await this.engine.processMessage(text, (accumulatedText) => {
                if(thinkingEl && thinkingEl.parentNode) {
                    thinkingEl.remove()
                }
                if(!assistantMessageRow) {
                    assistantMessageRow = this.createEmptyAssistantRow()
                }
                this.updateAssistantRowText(assistantMessageRow, accumulatedText)
                this.scrollToBottom()
            })

            if(thinkingEl && thinkingEl.parentNode) {
                thinkingEl.remove()
            }

            if(!assistantMessageRow) {
                this.appendAssistantMessage(result.text, result.cards, result.actions)
            } else {
                this.appendAssistantActions(assistantMessageRow, result.cards, result.actions)
            }

            this.updateSubtitle(result.statusText || 'AI assistant of Sai Vinoth')
        } catch (err) {
            if(thinkingEl && thinkingEl.parentNode) {
                thinkingEl.remove()
            }
            this.updateSubtitle('AI assistant of Sai Vinoth')
            this.appendAssistantMessage("Sai AI is temporarily unavailable. You can still explore Sai's portfolio directly.", [], [
                { type: 'navigate', label: 'View Projects', target: 'projects' },
                { type: 'navigate', label: 'Contact Sai', target: 'contact' }
            ])
        }

        this.scrollToBottom()
    }

    updateSubtitle(text)
    {
        if(this.subtitleElement) {
            this.subtitleElement.textContent = text
        }
    }

    appendUserMessage(text)
    {
        const row = document.createElement('div')
        row.className = 'message-row user'
        row.innerHTML = `<div class="bubble">${this.escapeHtml(text)}</div>`
        this.messagesElement.appendChild(row)
    }

    createEmptyAssistantRow()
    {
        const row = document.createElement('div')
        row.className = 'message-row assistant'
        row.innerHTML = `<div class="bubble js-bubble-text"></div>`
        this.messagesElement.appendChild(row)
        return row
    }

    updateAssistantRowText(row, text)
    {
        const bubble = row.querySelector('.js-bubble-text')
        if(bubble) {
            bubble.innerHTML = this.formatMarkdown(text)
        }
    }

    appendAssistantActions(row, cards = [], actions = [])
    {
        const bubble = row.querySelector('.js-bubble-text')
        if(!bubble) return

        let cardsHtml = ''
        if(cards && cards.length > 0) {
            cardsHtml = cards.map(c => `
                <div class="card-item">
                    <div class="card-title">${this.escapeHtml(c.title)}</div>
                    <div class="card-category">${this.escapeHtml(c.category || '')}</div>
                    <div class="card-desc">${this.escapeHtml(c.description || c.purpose || '')}</div>
                    <a href="${c.url}" target="_blank" rel="noopener noreferrer" class="card-cta">Visit ${this.escapeHtml(c.title)} →</a>
                </div>
            `).join('')
        }

        let actionsHtml = ''
        if(actions && actions.length > 0) {
            actionsHtml = actions.map(a => {
                if(a.type === 'url') {
                    return `<a href="${a.target}" target="_blank" rel="noopener noreferrer" class="action-btn">${this.escapeHtml(a.label)} →</a>`
                }
                return `<button class="action-btn js-action-btn" data-type="${a.type}" data-target="${a.target}">${this.escapeHtml(a.label)}</button>`
            }).join('')
        }

        bubble.innerHTML += cardsHtml + actionsHtml
    }

    appendAssistantMessage(text, cards = [], actions = [])
    {
        const row = document.createElement('div')
        row.className = 'message-row assistant'

        let cardsHtml = ''
        if(cards && cards.length > 0) {
            cardsHtml = cards.map(c => `
                <div class="card-item">
                    <div class="card-title">${this.escapeHtml(c.title)}</div>
                    <div class="card-category">${this.escapeHtml(c.category || '')}</div>
                    <div class="card-desc">${this.escapeHtml(c.description || c.purpose || '')}</div>
                    <a href="${c.url}" target="_blank" rel="noopener noreferrer" class="card-cta">Visit ${this.escapeHtml(c.title)} →</a>
                </div>
            `).join('')
        }

        let actionsHtml = ''
        if(actions && actions.length > 0) {
            actionsHtml = actions.map(a => {
                if(a.type === 'url') {
                    return `<a href="${a.target}" target="_blank" rel="noopener noreferrer" class="action-btn">${this.escapeHtml(a.label)} →</a>`
                }
                return `<button class="action-btn js-action-btn" data-type="${a.type}" data-target="${a.target}">${this.escapeHtml(a.label)}</button>`
            }).join('')
        }

        row.innerHTML = `
            <div class="bubble">
                ${this.formatMarkdown(text)}
                ${cardsHtml}
                ${actionsHtml}
            </div>
        `
        this.messagesElement.appendChild(row)
    }

    appendThinking(statusText = 'Thinking...')
    {
        const row = document.createElement('div')
        row.className = 'thinking-dots'
        row.innerHTML = `<span></span><span></span><span></span><span class="status-label">${this.escapeHtml(statusText)}</span>`
        this.messagesElement.appendChild(row)
        return row
    }

    scrollToBottom()
    {
        this.messagesElement.scrollTop = this.messagesElement.scrollHeight
    }

    escapeHtml(str)
    {
        return (str || '')
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;")
    }

    formatMarkdown(str)
    {
        let escaped = this.escapeHtml(str)
        return escaped
            .replace(/^### (.*$)/gim, '<h3 class="md-h3">$1</h3>')
            .replace(/^\* (.*$)/gim, '<li class="md-li">$1</li>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br/>')
    }
}
