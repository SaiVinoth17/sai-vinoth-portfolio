import { Game } from './Game.js'
import { SaiAIEngine } from './SaiAIEngine.js'
import { SaiAIAnalytics } from './SaiAIAnalytics.js'
import { 
    sai, 
    CANONICAL_PROJECTS, 
    CANONICAL_CONTACT, 
    buildWhatsAppUrl, 
    buildMailtoUrl, 
    resolveAIAction 
} from '../data/sai-ai.js'

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

        // Event delegation for suggestion pills and internal navigation buttons
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

                if(type === 'navigate' || type === 'navigation') {
                    if(target === 'projects') this.engine.getTools().showProjectsSection()
                    else if(target === 'about') this.engine.getTools().showAboutSection()
                    else if(target === 'contact') this.engine.getTools().showContactSection()
                    else this.engine.getTools().showContactSection()
                    SaiAIAnalytics.trackEvent('section_navigated_from_ai', { section: target })
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

        const clickSound = this.game.audio?.groups?.get('click')
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

        const clickSound = this.game.audio?.groups?.get('click')
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
        this.appendUserMessage(text)

        let statusMsg = 'Thinking...'
        const lower = text.toLowerCase()
        if(lower.includes('project') || lower.includes('work')) statusMsg = "Exploring projects..."
        else if(lower.includes('hire') || lower.includes('build') || lower.includes('contact') || lower.includes('whatsapp') || lower.includes('email')) statusMsg = "Connecting with Sai..."
        else if(lower.includes('experience')) statusMsg = "Checking experience..."

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
                this.appendAssistantMessage(result.text, result.components || result.cards, result.actions)
            } else {
                this.appendAssistantCardsAndActions(assistantMessageRow, result.components || result.cards, result.actions)
            }

            this.updateSubtitle(result.statusText || 'Sai Vinoth Portfolio Assistant')
        } catch (err) {
            if(thinkingEl && thinkingEl.parentNode) {
                thinkingEl.remove()
            }
            this.updateSubtitle('Sai Vinoth Portfolio Assistant')
            this.appendAssistantMessage(
                "Sai AI is temporarily unavailable, but you can still explore Sai's work or contact him directly.",
                [
                    { type: 'contact', title: 'Work with Sai', description: 'Reach Sai directly via WhatsApp or email.' }
                ],
                [
                    { type: 'navigation', target: 'projects', label: 'View Projects' }
                ]
            )
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

    /**
     * Render typed components using STRICT COMPONENT WHITELIST
     * Whitelist: ['project', 'project-list', 'experience', 'skills', 'contact', 'hire', 'github', 'action', 'navigation']
     */
    renderComponentsHtml(components = [])
    {
        if(!components || components.length === 0) return ''

        const WHITELIST = ['project', 'project-list', 'experience', 'skills', 'contact', 'hire', 'github', 'action', 'navigation']

        return components.map(comp => {
            if(!comp || !comp.type) return ''
            const type = comp.type.toLowerCase()

            if(!WHITELIST.includes(type)) {
                return '' // Ignore un-whitelisted dynamic component strings
            }

            // Project List Component (<AIProjectList /> -> renders multiple <AIProjectCard />)
            if(type === 'project-list') {
                const projectIds = comp.projectIds || Object.keys(CANONICAL_PROJECTS)
                const cardsHtml = projectIds.map(id => this.renderSingleProjectCard(id)).join('')
                return `<div class="ai-project-list">${cardsHtml}</div>`
            }

            // Single Project Card Component (<AIProjectCard />)
            if(type === 'project') {
                const projId = comp.projectId || comp.id || 'nilgiris-explorers'
                return this.renderSingleProjectCard(projId)
            }

            // Experience Component (<AIExperienceCard />)
            if(type === 'experience') {
                const exp = sai.experience[0]
                return `
                    <div class="ai-card experience-card">
                        <div class="card-header">
                            <span class="card-title">${this.escapeHtml(exp.role)}</span>
                            <span class="card-badge">${this.escapeHtml(exp.type || 'Freelance')}</span>
                        </div>
                        <div class="card-description">${this.escapeHtml(exp.description)}</div>
                    </div>
                `
            }

            // Skills Component (<AISkillGroup />)
            if(type === 'skills') {
                const skillsObj = sai.skills
                const groupsHtml = Object.entries(skillsObj).map(([groupName, skillsList]) => `
                    <div class="skill-group">
                        <div class="group-title">${this.escapeHtml(groupName)}</div>
                        <div class="chips-row">
                            ${skillsList.map(skill => `<span class="skill-chip">${this.escapeHtml(skill)}</span>`).join('')}
                        </div>
                    </div>
                `).join('')

                return `
                    <div class="ai-card skills-card">
                        ${groupsHtml}
                    </div>
                `
            }

            // GitHub Component (<AIGitHubCard />)
            if(type === 'github') {
                return `
                    <div class="ai-card github-card">
                        <div class="card-header">
                            <span class="card-title">GitHub</span>
                            <span class="card-subtitle">Sai Vinoth's public work</span>
                        </div>
                        <a href="${CANONICAL_CONTACT.github}" target="_blank" rel="noopener noreferrer" class="card-button" aria-label="Open Sai Vinoth's GitHub profile">Open GitHub ↗</a>
                    </div>
                `
            }

            // Contact / Hire Component (<AIContactCard />)
            if(type === 'contact' || type === 'hire') {
                const title = comp.title || 'Work with Sai'
                const desc = comp.description || "Have a website or web app project in mind? Let's talk about it."
                const customMsg = comp.customMessage || ''
                const waUrl = buildWhatsAppUrl(customMsg)
                const emailUrl = buildMailtoUrl()
                const contactType = (comp.contactType || 'both').toLowerCase()

                let buttonsHtml = ''
                if(contactType === 'whatsapp') {
                    buttonsHtml = `<a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="card-button whatsapp-button" aria-label="Chat with Sai on WhatsApp">WhatsApp →</a>`
                } else if(contactType === 'email') {
                    buttonsHtml = `<a href="${emailUrl}" target="_blank" rel="noopener noreferrer" class="card-button email-button" aria-label="Email Sai Vinoth">Email Sai →</a>`
                } else {
                    buttonsHtml = `
                        <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="card-button whatsapp-button" aria-label="Chat with Sai on WhatsApp">WhatsApp →</a>
                        <a href="${emailUrl}" target="_blank" rel="noopener noreferrer" class="card-button email-button" aria-label="Email Sai Vinoth">Email Sai →</a>
                    `
                }

                return `
                    <div class="ai-card hire-card">
                        <div class="card-header">
                            <span class="card-title">${this.escapeHtml(title)}</span>
                            <span class="card-badge">Hire Sai</span>
                        </div>
                        <div class="card-description">${this.escapeHtml(desc)}</div>
                        <div class="card-actions-row">
                            ${buttonsHtml}
                        </div>
                    </div>
                `
            }

            return ''
        }).join('')
    }

    renderSingleProjectCard(projId)
    {
        const projKey = Object.keys(CANONICAL_PROJECTS).find(k => k === projId || projId.includes(k))
        const proj = CANONICAL_PROJECTS[projKey] || CANONICAL_PROJECTS['nilgiris-explorers']

        return `
            <div class="ai-card project-card">
                <div class="card-header">
                    <span class="card-title">${this.escapeHtml(proj.title)}</span>
                    <span class="card-badge">${this.escapeHtml(proj.category || 'Web Project')}</span>
                </div>
                <div class="card-description">${this.escapeHtml(proj.description)}</div>
                <a href="${proj.url}" target="_blank" rel="noopener noreferrer" class="card-button" aria-label="View ${this.escapeHtml(proj.title)}">View Project ↗</a>
            </div>
        `
    }

    /**
     * Render action buttons using resolveAIAction to map to REAL HTML <a> or <button> elements
     */
    renderActionsHtml(actions = [])
    {
        if(!actions || actions.length === 0) return ''

        return actions.map(action => {
            const resolved = resolveAIAction(action)
            if(!resolved) return ''

            if(resolved.kind === 'external_url') {
                return `<a href="${resolved.url}" target="_blank" rel="noopener noreferrer" class="action-btn" aria-label="${this.escapeHtml(resolved.label)}">${this.escapeHtml(resolved.label)}</a>`
            }

            if(resolved.kind === 'internal_nav') {
                return `<button type="button" class="action-btn js-action-btn" data-type="navigate" data-target="${resolved.target}" aria-label="${this.escapeHtml(resolved.label)}">${this.escapeHtml(resolved.label)}</button>`
            }

            return ''
        }).filter(Boolean).join('')
    }

    appendAssistantCardsAndActions(row, components = [], actions = [])
    {
        const bubble = row.querySelector('.js-bubble-text')
        if(!bubble) return

        const componentsHtml = this.renderComponentsHtml(components)
        const actionsHtml = this.renderActionsHtml(actions)
        bubble.innerHTML += componentsHtml + actionsHtml
    }

    appendAssistantMessage(text, components = [], actions = [])
    {
        const row = document.createElement('div')
        row.className = 'message-row assistant'

        const componentsHtml = this.renderComponentsHtml(components)
        const actionsHtml = this.renderActionsHtml(actions)

        row.innerHTML = `
            <div class="bubble">
                ${this.formatMarkdown(text)}
                ${componentsHtml}
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
        if(!str) return ''

        // Clean up orphan plain URLs from text output
        let cleanedStr = str
            .replace(/https:\/\/[^\s\)]+/gi, '')
            .replace(/mailto:[^\s\)]+/gi, '')
            .replace(/\s{2,}/g, ' ')
            .trim()

        let escaped = this.escapeHtml(cleanedStr || str)

        return escaped
            .replace(/^### (.*$)/gim, '<h3 class="md-h3">$1</h3>')
            .replace(/^\* (.*$)/gim, '<li class="md-li">$1</li>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br/>')
    }
}
