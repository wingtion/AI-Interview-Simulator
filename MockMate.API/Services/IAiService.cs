using MockMate.API.Models;

namespace MockMate.API.Services
{
    public interface IAiService
    {
        Task<AiResponse> GetResponseAsync(UserInput input);
        Task<InterviewFeedback> GenerateFeedbackAsync();
        Task<string> GenerateProblemAsync(string topic, string difficulty);

    }
}