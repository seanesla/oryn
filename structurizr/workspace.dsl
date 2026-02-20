workspace "oryn Architecture" "C4 model for the oryn live co-reading agent." {
  !identifiers hierarchical

  model {
    user = person "Reader" "Uses oryn to analyze content and hold live co-reading sessions."

    oryn = softwareSystem "oryn" "Live co-reading agent that builds evidence-backed disagreement maps." {
      web = container "Web Client" "Next.js app for creating sessions, reviewing evidence cards, and running live audio." "Next.js 16, React 19"
      api = container "Backend Orchestrator" "Fastify service that manages sessions, runs analysis, and proxies Gemini Live streams." "Fastify 5 on Cloud Run" {
        sessionRoutes = component "Session Routes + SSE" "REST handlers for session CRUD, mutations, analyze trigger, and SSE endpoint." "Fastify routes + Zod"
        liveGateway = component "Live Voice Gateway" "WebSocket handler that bridges browser audio with Gemini Live and tool calls." "Fastify WebSocket route"
        analysisPipeline = component "Analysis Pipeline" "Fetches content, extracts claims, runs grounded search, and builds evidence artifacts." "TypeScript services"
        sessionStore = component "Session Store Adapter" "Abstracted store backed by in-memory map or Firestore implementation." "SessionStore interface"
        sessionEventBus = component "Session Event Bus" "In-process pub/sub broadcasting session state updates to SSE and WS clients." "In-memory event bus"
        genaiClient = component "GenAI Client Factory" "Creates Developer API or Vertex AI clients from environment settings." "@google/genai"
      }
    }

    firestore = softwareSystem "Cloud Firestore (optional)" "Persistent session storage when SESSION_STORE=firestore."
    geminiLive = softwareSystem "Gemini Live API" "Real-time bidirectional audio + transcript streaming and tool calls."
    geminiApi = softwareSystem "Gemini API" "Grounded generateContent calls used to discover supporting and counter evidence."
    googleSearch = softwareSystem "Google Search" "Grounding provider used by Gemini generateContent with googleSearch tool."
    webSources = softwareSystem "Public Web Sources" "Original article URLs and cited source pages fetched during analysis."

    user -> oryn.web "Starts sessions, reviews evidence, and speaks in live mode"
    oryn.web -> oryn.api "Creates sessions, triggers analysis, and updates session data" "HTTPS/JSON (REST)"
    oryn.api -> oryn.web "Pushes session snapshots and pipeline progress" "Server-Sent Events"
    oryn.web -> oryn.api "Streams microphone audio and control messages" "WebSocket"
    oryn.api -> oryn.web "Streams model audio and transcript chunks" "WebSocket"

    oryn.api -> geminiLive "Opens live sessions and forwards audio/tool responses" "Google GenAI Live"
    oryn.api -> geminiApi "Runs grounded search queries" "Google GenAI generateContent"
    geminiApi -> googleSearch "Uses grounding tool for source discovery"

    oryn.api -> webSources "Fetches article and citation pages for extraction" "HTTPS"
    oryn.api -> firestore "Persists and lists sessions when enabled" "Firestore API"

    oryn.web -> oryn.api.sessionRoutes "REST + SSE"
    oryn.web -> oryn.api.liveGateway "WebSocket audio"

    oryn.api.sessionRoutes -> oryn.api.sessionEventBus "Publish session.state"
    oryn.api.sessionRoutes -> oryn.api.analysisPipeline "Start analysis"

    oryn.api.liveGateway -> oryn.api.sessionEventBus "Publish transcript"
    oryn.api.liveGateway -> oryn.api.analysisPipeline "Tool: evidence pack"
    oryn.api.liveGateway -> oryn.api.genaiClient "Connect Live"
    oryn.api.liveGateway -> geminiLive "Live stream"

    oryn.api.analysisPipeline -> oryn.api.sessionStore "Persist artifacts"
    oryn.api.analysisPipeline -> oryn.api.sessionEventBus "Publish progress"
    oryn.api.analysisPipeline -> oryn.api.genaiClient "Auth client"
    oryn.api.analysisPipeline -> geminiApi "Grounded search"
    oryn.api.analysisPipeline -> webSources "Fetch sources"

    oryn.api.sessionStore -> firestore "Persist sessions (optional)"
    oryn.api.genaiClient -> geminiLive "Auth Live"
    oryn.api.genaiClient -> geminiApi "Auth generateContent"
  }

  views {
    container oryn "general-architecture" "User-facing containers and external dependencies." {
      include user
      include oryn.web
      include oryn.api
      include firestore
      include geminiLive
      include geminiApi
      include googleSearch
      include webSources
      autolayout lr
    }

    component oryn.api "live-co-reading-flow" "Main runtime flow inside the backend orchestrator." {
      include oryn.web
      include oryn.api.sessionRoutes
      include oryn.api.liveGateway
      include oryn.api.analysisPipeline
      include oryn.api.sessionStore
      include geminiLive
      include geminiApi
      include webSources
      include firestore
      autolayout lr
    }

    styles {
      element "Element" {
        background #15243a
        color #f8fafc
        stroke #3b4f74
        strokeWidth 2
        fontSize 24
      }

      relationship "Relationship" {
        color #8bd3dd
        thickness 3
        fontSize 18
      }
    }
  }
}
