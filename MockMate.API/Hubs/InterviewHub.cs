using Microsoft.AspNetCore.SignalR;
using MockMate.API.Models;
using MockMate.API.Services;
namespace MockMate.API.Hubs;

public class InterviewHub : Hub
{
    private readonly IAiService _aiService;

    // Track which connections have ended their session
    private static readonly HashSet<string> _endedSessions = new();

    public InterviewHub(IAiService aiService)
    {
        _aiService = aiService;
    }

    public async Task ProcessUserAudio(UserInput input)
    {
        var connectionId = Context.ConnectionId;

        await Clients.Caller.SendAsync("ReceiveSystemStatus", "AI is thinking...");
        var response = await _aiService.GetResponseAsync(input);

        // Only send if the session hasn't ended while we were waiting for Groq
        if (!_endedSessions.Contains(connectionId))
        {
            await Clients.Caller.SendAsync("ReceiveAiResponse", response);
        }
    }

    public async Task<InterviewFeedback> EndSession()
    {
        // Mark this connection as ended BEFORE awaiting feedback
        _endedSessions.Add(Context.ConnectionId);

        var feedback = await _aiService.GenerateFeedbackAsync();
        return feedback;
    }



    public override Task OnDisconnectedAsync(Exception? exception)
    {
        // Clean up when connection closes
        _endedSessions.Remove(Context.ConnectionId);
        return base.OnDisconnectedAsync(exception);
    }
}