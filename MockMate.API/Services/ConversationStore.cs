using System.Collections.Concurrent;

namespace MockMate.API.Services
{
    /// <summary>
    /// Holds per-session interview conversation history.
    /// Registered as a singleton and keyed by the SignalR ConnectionId, so every
    /// interview session is isolated from other users and starts fresh (a new
    /// connection means a new id, hence an empty history).
    /// </summary>
    public class ConversationStore
    {
        private readonly ConcurrentDictionary<string, List<object>> _sessions = new();

        /// <summary>Returns the (mutable) history list for a session, creating it if needed.</summary>
        public List<object> GetHistory(string sessionId) =>
            _sessions.GetOrAdd(sessionId, _ => new List<object>());

        /// <summary>Drops a session's history (call on end / disconnect).</summary>
        public void Reset(string sessionId) => _sessions.TryRemove(sessionId, out _);
    }
}
