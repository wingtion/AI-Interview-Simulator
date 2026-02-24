namespace MockMate.API.Models
{
    public class UserInput
    {
        public string Text { get; set; } = string.Empty; 
        public string CurrentCode { get; set; } = string.Empty;

        public string Mode { get; set; } = "Standard";
    }

    public class AiResponse
    {
        public string Message { get; set; } = string.Empty; 
        public bool IsCodeRequest { get; set; } 
    }
}