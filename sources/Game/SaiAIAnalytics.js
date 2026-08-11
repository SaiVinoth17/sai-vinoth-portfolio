export class SaiAIAnalytics
{
    static events = []

    static trackEvent(eventName, payload = {})
    {
        const event = {
            name: eventName,
            payload: payload,
            timestamp: new Date().toISOString()
        }

        this.events.push(event)

        if(import.meta.env.DEV) {
            console.log(`[SaiAIAnalytics] Event: ${eventName}`, payload)
        }
    }

    static getEvents()
    {
        return [...this.events]
    }
}
