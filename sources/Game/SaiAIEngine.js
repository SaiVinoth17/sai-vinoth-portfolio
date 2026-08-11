import { SAI_KNOWLEDGE } from '../data/sai-ai.js'
import { Game } from './Game.js'
import { SaiAIAnalytics } from './SaiAIAnalytics.js'

export class SaiAIEngine
{
    constructor()
    {
        this.game = Game.getInstance()
        this.history = []
        this.requestTimestamps = []
        this.currentAbortController = null

        this.hireMode = {
            active: false,
            step: 0,
            data: {
                type: '',
                features: ''
            }
        }

        // Groq configuration
        this.apiKey = import.meta.env.VITE_GROQ_API_KEY || import.meta.env.GROQ_API_KEY || import.meta.env.VITE_LLM_API_KEY || ''
        this.model = import.meta.env.VITE_LLM_MODEL || import.meta.env.LLM_MODEL || 'openai/gpt-oss-20b'
    }

    /**
     * Rate Limiting Safeguard (Max 10 requests per minute)
     */
    checkRateLimit()
    {
        const now = Date.now()
        this.requestTimestamps = this.requestTimestamps.filter(t => now - t < 60000)
        if(this.requestTimestamps.length >= 10) {
            return false
        }
        this.requestTimestamps.push(now)
        return true
    }

    /**
     * Formal Safe Tool Definitions
     */
    getTools()
    {
        return {
            getAbout: () => {
                return {
                    name: SAI_KNOWLEDGE.person.name,
                    role: SAI_KNOWLEDGE.person.role,
                    bio: SAI_KNOWLEDGE.person.bio,
                    location: SAI_KNOWLEDGE.person.location,
                    brand: SAI_KNOWLEDGE.person.shortBrand
                }
            },
            getSkills: () => {
                return {
                    skills: SAI_KNOWLEDGE.technologies.map(t => t.name),
                    details: SAI_KNOWLEDGE.technologies
                }
            },
            searchProjects: (query = '') => {
                const q = query.toLowerCase().trim()
                if(!q) return SAI_KNOWLEDGE.projects
                return SAI_KNOWLEDGE.projects.filter(p => 
                    p.title.toLowerCase().includes(q) ||
                    p.category.toLowerCase().includes(q) ||
                    p.description.toLowerCase().includes(q) ||
                    p.useCases.some(uc => uc.toLowerCase().includes(q)) ||
                    p.tags.some(t => t.toLowerCase().includes(q))
                )
            },
            getProjectDetails: (name = '') => {
                const q = name.toLowerCase().trim()
                const match = SAI_KNOWLEDGE.projects.find(p => 
                    p.id === q || p.title.toLowerCase().includes(q)
                )
                return match || null
            },
            getContact: () => {
                return SAI_KNOWLEDGE.contact
            },
            openProject: (projectIdOrUrl) => {
                const p = this.getTools().getProjectDetails(projectIdOrUrl)
                let targetUrl = p ? p.url : projectIdOrUrl

                const allowedUrls = [
                    'https://github.com/SaiVinoth17',
                    'https://saivinoth.netlify.app/',
                    'https://thegamingkingdom.netlify.app/',
                    'https://nilgirisexplorers.com/',
                    'https://ootymistwings.com/',
                    'https://houseofpetalss.netlify.app/'
                ]

                if(allowedUrls.includes(targetUrl)) {
                    window.open(targetUrl, '_blank', 'noopener,noreferrer')
                    return { status: 'opened', url: targetUrl }
                }
                return { status: 'url_blocked', url: targetUrl }
            },
            showProjects: () => {
                if(this.game.world?.areas?.projects) {
                    this.game.world.areas.projects.open()
                    return { status: 'navigated', section: 'projects' }
                }
                return { status: 'area_unavailable' }
            },
            showSkills: () => {
                if(this.game.menu) {
                    this.game.menu.open('home')
                    return { status: 'navigated', section: 'skills' }
                }
                return { status: 'menu_unavailable' }
            },
            showContact: () => {
                if(this.game.menu) {
                    this.game.menu.open('social')
                    return { status: 'navigated', section: 'contact' }
                }
                return { status: 'menu_unavailable' }
            },
            startHireFlow: () => {
                this.hireMode.active = true
                this.hireMode.step = 1
                return { status: 'hire_flow_started' }
            },
            recommendProjectForRequirement: (requirement = '') => {
                const req = requirement.toLowerCase().trim()
                let matches = []

                for(const proj of SAI_KNOWLEDGE.projects) {
                    let score = 0
                    if(req.includes(proj.id)) score += 10
                    if(proj.useCases.some(uc => req.includes(uc))) score += 5
                    if(req.includes(proj.category.toLowerCase())) score += 5
                    if(proj.tags.some(t => req.includes(t.toLowerCase()))) score += 3

                    if(score > 0) {
                        matches.push({ project: proj, score: score })
                    }
                }

                matches.sort((a, b) => b.score - a.score)
                return matches.length > 0 ? matches[0].project : (SAI_KNOWLEDGE.projects.find(p => p.isStrongest) || SAI_KNOWLEDGE.projects[0])
            }
        }
    }

    /**
     * Process message from user
     */
    async processMessage(userText, onChunk = null)
    {
        const text = (userText || '').trim()

        if(!text) {
            return {
                statusText: 'Waiting for input...',
                text: "Please ask a question about Sai Vinoth's work, skills, or projects.",
                cards: [],
                actions: []
            }
        }

        if(text.length > 500) {
            return {
                statusText: 'Input too long',
                text: "Please keep your question under 500 characters.",
                cards: [],
                actions: []
            }
        }

        if(!this.checkRateLimit()) {
            return {
                statusText: 'Rate limit exceeded',
                text: "You're asking questions very quickly! Please wait a moment before sending another message.",
                cards: [],
                actions: []
            }
        }

        SaiAIAnalytics.trackEvent('question_submitted', { text })

        if(this.hireMode.active) {
            return this.processHireModeStep(text)
        }

        this.history.push({ role: 'user', content: text })

        // Groq API call if key configured
        if(this.apiKey) {
            try {
                return await this.processWithGroqStream(text, onChunk)
            } catch (err) {
                console.warn('Groq API call error, falling back to intelligent local engine:', err)
            }
        }

        return this.processWithLocalEngine(text)
    }

    /**
     * Interactive Hire Mode Discovery Flow
     */
    processHireModeStep(userText)
    {
        if(this.hireMode.step === 1) {
            this.hireMode.data.type = userText
            this.hireMode.step = 2

            return {
                statusText: 'Gathering requirements...',
                text: `Got it! A **${userText}** project. What are the key features or design functionality you need? (e.g. online booking, custom shopfront, interactive 3D UI)`,
                cards: [],
                actions: [
                    { type: 'navigate', label: 'Skip to Contact', target: 'contact' }
                ]
            }
        }
        else if(this.hireMode.step === 2) {
            this.hireMode.data.features = userText
            this.hireMode.active = false
            this.hireMode.step = 0

            const recommendedProj = this.getTools().recommendProjectForRequirement(this.hireMode.data.type)

            SaiAIAnalytics.trackEvent('hire_summary_generated', this.hireMode.data)

            const summaryText = `### PROJECT SUMMARY\n\n` +
                `* **Type**: ${this.hireMode.data.type}\n` +
                `* **Key Requirements**: ${this.hireMode.data.features}\n` +
                `* **Relevant Sai Capabilities**: React, Next.js, Tailwind CSS, Fullstack Web Engineering\n` +
                `* **Closest Portfolio Reference**: ${recommendedProj.title}\n\n` +
                `Sai Vinoth can build a tailored, high-performance web experience for your project! Click below to connect directly.`

            return {
                statusText: 'Project summary ready!',
                text: summaryText,
                cards: [recommendedProj],
                actions: [
                    { type: 'navigate', label: 'Contact Sai Vinoth', target: 'contact' },
                    { type: 'url', label: 'View GitHub Profile', target: SAI_KNOWLEDGE.person.github }
                ]
            }
        }
    }

    /**
     * Intelligent Local Engine
     */
    processWithLocalEngine(text)
    {
        const lower = text.toLowerCase()
        const tools = this.getTools()

        // 1. Check for Bruno Simon queries -> Reject cleanly
        if(lower.includes('bruno') || lower.includes('bruno simon')) {
            return {
                statusText: 'Sai Vinoth Portfolio Assistant',
                text: "I don't have information about Bruno Simon's projects. As Sai Vinoth's portfolio assistant, I can share Sai's projects: **Nilgiris Explorers**, **Gaming Kingdom**, **Ooty Mistwings**, and **House Of Petalss**.",
                cards: SAI_KNOWLEDGE.projects,
                actions: []
            }
        }

        // Multi-turn context resolution
        const lastTurn = this.history.length > 2 ? this.history[this.history.length - 3]?.content?.toLowerCase() || '' : ''
        let contextProject = null
        if(lastTurn.includes('nilgiris')) contextProject = tools.getProjectDetails('nilgiris-explorers')
        else if(lastTurn.includes('gaming')) contextProject = tools.getProjectDetails('gaming-kingdom')
        else if(lastTurn.includes('ooty') || lastTurn.includes('mistwings')) contextProject = tools.getProjectDetails('ooty-mistwings')
        else if(lastTurn.includes('petal')) contextProject = tools.getProjectDetails('house-of-petalss')

        // 2. Strict Anti-Hallucination Guard
        const forbiddenKeywords = ['salary', 'earnings', 'client list', 'past clients', 'company list', 'award', 'employment', 'phone number', 'email address']
        if(forbiddenKeywords.some(kw => lower.includes(kw))) {
            return {
                statusText: 'Checking verified knowledge base...',
                text: "I don't have verified information about that.",
                cards: [],
                actions: [
                    { type: 'navigate', label: 'Explore Projects', target: 'projects' },
                    { type: 'navigate', label: 'Contact Sai', target: 'contact' }
                ]
            }
        }

        // 3. Hire Intent
        if(lower.includes('hire') || lower.includes('build my website') || lower.includes('need a developer') || lower.includes('work with sai') || lower.includes('have a project')) {
            tools.startHireFlow()
            SaiAIAnalytics.trackEvent('hire_mode_started')

            return {
                statusText: 'Starting project discovery...',
                text: "Sai Vinoth is available for web development projects! Let's do a quick project discovery.\n\n**What type of website or application are you looking to build?** (e.g. Tourism portal, E-Commerce, Hotel/Resort, Company website, Web App)",
                cards: [],
                actions: [
                    { type: 'navigate', label: 'Skip to Contact', target: 'contact' }
                ]
            }
        }

        // 4. Tourism requirement / recommendation query
        if(lower.includes('tourism') || lower.includes('travel') || lower.includes('destination') || lower.includes('hotel') || lower.includes('resort') || lower.includes('vacation')) {
            const recommendedProj = tools.getProjectDetails('nilgiris-explorers')
            return {
                statusText: "Recommending relevant project...",
                text: `**Nilgiris Explorers** is the most relevant project in Sai Vinoth's portfolio to explore. It focuses on the Nilgiris tourism and travel experience, built with Next.js, React, and Tailwind CSS.`,
                cards: [recommendedProj],
                actions: [
                    { type: 'url', label: 'Visit Nilgiris Explorers →', target: recommendedProj.url }
                ]
            }
        }

        // 5. Specific project queries: Nilgiris Explorers
        if(lower.includes('nilgiris')) {
            const p = tools.getProjectDetails('nilgiris-explorers')
            return {
                statusText: 'Nilgiris Explorers',
                text: `**Nilgiris Explorers** is a comprehensive travel and tourism portal built for discovering the Nilgiris district, local spots, and tourist experiences using **Next.js, React, and Tailwind CSS**.`,
                cards: [p],
                actions: [
                    { type: 'url', label: 'Visit Nilgiris Explorers →', target: p.url }
                ]
            }
        }

        // 6. Specific project queries: Gaming Kingdom
        if(lower.includes('gaming') || lower.includes('kingdom')) {
            const p = tools.getProjectDetails('gaming-kingdom')
            return {
                statusText: 'Gaming Kingdom',
                text: `**Gaming Kingdom** is an interactive platform dedicated to gaming news, features, and community experiences built with **HTML, CSS, and JavaScript**.`,
                cards: [p],
                actions: [
                    { type: 'url', label: 'Visit Gaming Kingdom →', target: p.url }
                ]
            }
        }

        // 7. Specific project queries: Ooty Mistwings
        if(lower.includes('ooty') || lower.includes('mistwings')) {
            const p = tools.getProjectDetails('ooty-mistwings')
            return {
                statusText: 'Ooty Mistwings',
                text: `**Ooty Mistwings** is a modern resort and hospitality web platform highlighting nature stays, local nature attractions, and bookings in Ooty.`,
                cards: [p],
                actions: [
                    { type: 'url', label: 'Visit Ooty Mistwings →', target: p.url }
                ]
            }
        }

        // 8. Specific project queries: House Of Petalss
        if(lower.includes('petal') || lower.includes('house of petalss')) {
            const p = tools.getProjectDetails('house-of-petalss')
            return {
                statusText: 'House Of Petalss',
                text: `**House Of Petalss** is an elegant digital storefront showcasing floral designs, custom arrangements, and artisanal gifts built with **React and Tailwind CSS**.`,
                cards: [p],
                actions: [
                    { type: 'url', label: 'Visit House Of Petalss →', target: p.url }
                ]
            }
        }

        // 9. All projects / Show me projects query
        if(lower.includes('all project') || lower.includes('all work') || lower.includes('all his work') || lower.includes('show me sai\'s projects') || lower.includes('show projects') || lower.includes('projects has sai built') || lower.includes('what project')) {
            const projects = tools.searchProjects()
            return {
                statusText: 'Sai Vinoth Verified Projects',
                text: `Here are Sai Vinoth's verified portfolio projects:`,
                cards: projects,
                actions: []
            }
        }

        // 10. Contextual follow-up
        if(contextProject && (lower.includes('stack') || lower.includes('tech') || lower.includes('use') || lower.includes('similar') || lower.includes('it'))) {
            return {
                statusText: 'Resolving conversation context...',
                text: `**${contextProject.title}** uses **${contextProject.tags.join(', ')}**. Sai Vinoth can build something similar for your application.`,
                cards: [contextProject],
                actions: [
                    { type: 'url', label: `Visit ${contextProject.title} →`, target: contextProject.url },
                    { type: 'navigate', label: 'Contact Sai', target: 'contact' }
                ]
            }
        }

        // GitHub query
        if(lower.includes('github') || lower.includes('repo') || lower.includes('source code')) {
            const contact = tools.getContact()
            return {
                statusText: 'Fetching GitHub profile...',
                text: `You can check out Sai Vinoth's public repositories and code on GitHub at **${contact.github}**.`,
                cards: [],
                actions: [
                    { type: 'url', label: 'Open GitHub (SaiVinoth17)', target: contact.github }
                ]
            }
        }

        // Contact query
        if(lower.includes('contact') || lower.includes('reach') || lower.includes('message')) {
            return {
                statusText: 'Opening contact details...',
                text: `You can contact Sai Vinoth directly through the portfolio contact section or via GitHub.`,
                cards: [],
                actions: [
                    { type: 'navigate', label: 'Open Contact Form', target: 'contact' }
                ]
            }
        }

        // Skills query
        if(lower.includes('skill') || lower.includes('stack') || lower.includes('tech') || lower.includes('react') || lower.includes('next') || lower.includes('python')) {
            const skills = tools.getSkills()
            return {
                statusText: 'Retrieving tech stack...',
                text: `Sai Vinoth works with **${skills.skills.join(', ')}**.`,
                cards: [],
                actions: [
                    { type: 'navigate', label: 'View Projects', target: 'projects' }
                ]
            }
        }

        // Identity query
        if(lower.includes('who') || lower.includes('sai') || lower.includes('about')) {
            const p = tools.getAbout()
            return {
                statusText: 'Introducing Sai Vinoth...',
                text: `**Sai Vinoth** is a Web Developer / Frontend Developer based in ${p.location}, focused on building modern, interactive web applications.`,
                cards: [],
                actions: [
                    { type: 'navigate', label: 'About Sai Vinoth', target: 'about' },
                    { type: 'navigate', label: 'View Projects', target: 'projects' }
                ]
            }
        }

        // Strict fallback
        return {
            statusText: 'Checking knowledge base...',
            text: "I don't have verified information about that.",
            cards: [],
            actions: [
                { type: 'navigate', label: 'View Projects', target: 'projects' },
                { type: 'navigate', label: 'Contact Sai', target: 'contact' }
            ]
        }
    }

    /**
     * Groq SSE Streaming Request with model openai/gpt-oss-20b
     */
    async processWithGroqStream(text, onChunk)
    {
        if(this.currentAbortController) {
            this.currentAbortController.abort()
        }
        this.currentAbortController = new AbortController()

        const systemPrompt = `You are Sai AI, the portfolio assistant for Sai Vinoth (brand: SaiRio), a Web Developer based in India.
Model: ${this.model}

Verified Projects:
${JSON.stringify(SAI_KNOWLEDGE.projects, null, 2)}

Strict Instructions:
1. NEVER invent URLs. ONLY reference the verified URLs provided above.
2. If asked about Bruno Simon's projects, decline and stay focused on Sai Vinoth's 4 projects.
3. If asked about unverified information, say: "I don't have verified information about that."
4. Keep answers short and concise (1-4 short paragraphs/bullets).`

        const messages = [
            { role: 'system', content: systemPrompt },
            ...this.history.slice(-6)
        ]

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            signal: this.currentAbortController.signal,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: this.model,
                messages: messages,
                temperature: 0.2,
                max_tokens: 300,
                stream: true
            })
        })

        if(!response.ok) {
            throw new Error(`Groq API returned status ${response.status}`)
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder('utf-8')
        let fullText = ''

        while(true) {
            const { done, value } = await reader.read()
            if(done) break

            const chunk = decoder.decode(value)
            const lines = chunk.split('\n')

            for(const line of lines) {
                if(line.startsWith('data: ') && line !== 'data: [DONE]') {
                    try {
                        const json = JSON.parse(line.substring(6))
                        const contentChunk = json.choices[0]?.delta?.content || ''
                        if(contentChunk) {
                            fullText += contentChunk
                            if(onChunk) onChunk(fullText)
                        }
                    } catch (e) {
                        // ignore malformed SSE line
                    }
                }
            }
        }

        this.history.push({ role: 'assistant', content: fullText })

        return {
            statusText: 'Powered by Groq gpt-oss-20b',
            text: fullText,
            cards: [],
            actions: []
        }
    }
}
