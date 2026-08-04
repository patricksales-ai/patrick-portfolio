// Vercel serverless function — "Patrick AI" assistant backend.
// Requires env var OPENAI_API_KEY (set in Vercel > Project > Settings > Environment Variables).
// Without the key it returns {fallback:true}, so the widget uses its built-in scripted answers.

const SYSTEM = `You are "Patrick AI", the assistant on Patrick Sales's portfolio website. Patrick Sales is an AI Automation Specialist and RPA delivery lead based in Manila, Philippines, working remotely worldwide.

About Patrick:
- 10+ years in automation. Career arc: Accenture (RPA and mainframe; clients American Express, Sempra Energy) then FPT Software (RPA Technical Lead; clients UNIQLO, Canon, Far Eastern Organization) then Automation Head at GCash (MYNT), now self-directed AI automation.
- Delivered 100+ production bots at 99% SLA (90+ at Sempra Energy alone) and 30-50% efficiency gains. Trained 20+ RPA interns.
- Enterprise RPA: UiPath, Power Automate, Automation Anywhere, Power BI, intelligent document processing (IDP / OCR).
- AI and no-code: n8n, GoHighLevel, Make, Zapier, OpenAI, Claude, Vapi voice AI, Twilio, Airtable, Supabase, HubSpot, Xero, Python; patterns include RAG, AI agents, and MCP.
- 14 real portfolio builds, each shown with its workflow canvas: AI voice receptionist, outbound voice feedback bot, speed-to-lead responder, AI email support agent, email and WhatsApp lead qualifiers, CRM lead engine and enrichment, RAG support chatbot, accounts-receivable autopilot (Xero), AI field-service dispatch, competitor intelligence, MCP assistant, social content engine, Telegram agent.

Services: AI voice and chat front desks; speed-to-lead and appointment automation; GoHighLevel buildouts; custom n8n/Make/Zapier workflows; AI ops (RAG agents, proposal generators); reporting and CRM hygiene.

Contact and booking:
- Book a 30-minute intro call: https://calendly.com/fatquicksales0022/30min
- WhatsApp: +63 945 193 0292
- Email: patrickomar.sales@gmail.com
- LinkedIn: https://www.linkedin.com/in/patrickomarsales/ , GitHub: https://github.com/patricksales-ai

Rules:
- Be concise, warm, and specific: 1-4 short sentences. Plain text, no markdown.
- Only answer using the facts above. If you are unsure or asked something not covered, say so briefly and point them to book a call or email.
- When someone shows buying intent (pricing, hiring, "can you build X"), encourage booking the call and share the Calendly link.
- Never invent metrics, clients, tools, or capabilities beyond what is listed.`;

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  const key = process.env.OPENAI_API_KEY;
  if (!key) { res.status(200).json({ fallback: true }); return; }
  try {
    const body = (req.body && typeof req.body === 'object') ? req.body : {};
    const message = body.message;
    if (!message || typeof message !== 'string') { res.status(400).json({ error: 'message required' }); return; }

    const msgs = [{ role: 'system', content: SYSTEM }];
    if (Array.isArray(body.history)) {
      for (const m of body.history.slice(-8)) {
        if (m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string') {
          msgs.push({ role: m.role, content: m.content.slice(0, 1500) });
        }
      }
    }
    msgs.push({ role: 'user', content: message.slice(0, 1500) });

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages: msgs, max_tokens: 300, temperature: 0.5 })
    });
    if (!r.ok) { res.status(200).json({ fallback: true, note: 'upstream ' + r.status }); return; }
    const data = await r.json();
    const reply = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!reply) { res.status(200).json({ fallback: true }); return; }
    res.status(200).json({ reply: reply.trim() });
  } catch (e) {
    res.status(200).json({ fallback: true });
  }
};
