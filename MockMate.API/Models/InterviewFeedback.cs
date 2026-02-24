namespace MockMate.API.Models
{
    public class InterviewFeedback
    {
        public int CodingScore { get; set; } // 1-10
        public int CommunicationScore { get; set; } // 1-10
        public List<string> FeedbackPoints { get; set; } = new List<string>();
    }
}