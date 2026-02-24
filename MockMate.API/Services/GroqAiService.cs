using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using MockMate.API.Models;

namespace MockMate.API.Services
{
    public class GroqAiService : IAiService
    {
        private readonly HttpClient _httpClient;
        private readonly string _apiKey;
        private readonly JsonSerializerOptions _jsonOptions;

        // 🧠 SIMPLE MEMORY: Stores chat history
        private static List<object> _conversationHistory = new();

        public GroqAiService(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _apiKey = configuration["GroqApiKey"];
            _jsonOptions = new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                WriteIndented = true
            };
        }

        public async Task<AiResponse> GetResponseAsync(UserInput input)
        {
            // 1. Determine the System Persona based on Mode
            string systemPrompt = "You are a helpful technical interviewer.";

            switch (input.Mode)
            {
                case "Google":
                    systemPrompt = "You are a Senior Google Staff Engineer. You care deeply about Big O notation, scalability, and edge cases. You are strict. If the user writes O(n^2) code, question it immediately. Do not be polite; be rigorous.";
                    break;
                case "Startup":
                    systemPrompt = "You are a CTO of a fast-paced YCombinator startup. You care about speed, shipping features, and clean, readable code. You don't care about micro-optimizations. You want to see if the candidate can build things fast.";
                    break;
                case "Behavioral":
                    systemPrompt = "You are an HR Manager. Do not ask for code. Ask about conflict resolution, leadership principles, and past experiences. Use the STAR method.";
                    break;
                case "Resume": 
                    systemPrompt = "You are a tough Hiring Manager. The user has provided their resume. Your job is to GRILL them on it. Pick one specific project or skill from the resume they provided and ask a highly technical follow-up question. Do not just summarize their resume. Ask them 'Why did you choose X over Y?' or 'How did you scale Z?'. Keep your question under 3 sentences.";
                    break;
                default: // Standard
                    systemPrompt = "You are a friendly but professional technical interviewer. Guide the candidate through the problem.";
                    break;
            }

            // 2. Add User's new message to history
            var userMessage = new
            {
                role = "user",
                content = $"[Mode: {input.Mode}]\n[Current Code]:\n{input.CurrentCode}\n\n[Candidate Says]:\n{input.Text}"
            };

            // 3. Reset history if it's the start, or update system prompt context
            if (_conversationHistory.Count == 0)
            {
                _conversationHistory.Add(new { role = "system", content = systemPrompt });
            }

            _conversationHistory.Add(userMessage);

            while (_conversationHistory.Count > 8)
            {
                _conversationHistory.RemoveAt(1);
            }

            // 4. Prepare the Request
            var requestData = new
            {
                // WAS: "llama-3.3-70b-versatile"
                // CHANGE TO:
                //model = "llama-3.3-70b-versatile",
                model = "llama-3.1-8b-instant",
                messages = _conversationHistory,
                temperature = 0.6
            };

            var jsonContent = JsonSerializer.Serialize(requestData, _jsonOptions);
            var httpContent = new StringContent(jsonContent, Encoding.UTF8, "application/json");

            var request = new HttpRequestMessage(HttpMethod.Post, "https://api.groq.com/openai/v1/chat/completions");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);
            request.Content = httpContent;

            // 5. Send
            var response = await _httpClient.SendAsync(request);
            var responseString = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                Console.WriteLine($"❌ Groq Error: {responseString}");
                return new AiResponse { Message = "I had trouble thinking. Please try again." };
            }

            var groqResponse = JsonSerializer.Deserialize<GroqApiResponse>(responseString, _jsonOptions);
            var aiText = groqResponse?.Choices?.FirstOrDefault()?.Message?.Content ?? "";

            // 6. Add AI's response to history
            _conversationHistory.Add(new { role = "assistant", content = aiText });

            return new AiResponse
            {
                Message = aiText,
                IsCodeRequest = false
            };
        }

        public async Task<string> GenerateProblemAsync(string topic, string difficulty)
        {
            var prompt = $@"
        Generate a coding interview problem.
        Topic: {topic}
        Difficulty: {difficulty}
        
        Output format:
        1. Title
        2. Description
        3. Example Input/Output
        4. Constraints
        
        Do NOT provide the solution or code. 
        Format the output as a code comment (using // for every line) so it can be pasted directly into a code editor.
    ";

            var requestData = new
            {
                model = "llama-3.1-8b-instant", // Fast model is fine for this
                messages = new[]
                {
            new { role = "system", content = "You are a LeetCode problem generator." },
            new { role = "user", content = prompt }
        }
            };

            var jsonContent = JsonSerializer.Serialize(requestData, _jsonOptions);
            var httpContent = new StringContent(jsonContent, Encoding.UTF8, "application/json");

            var request = new HttpRequestMessage(HttpMethod.Post, "https://api.groq.com/openai/v1/chat/completions");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);
            request.Content = httpContent;

            var response = await _httpClient.SendAsync(request);

            if (!response.IsSuccessStatusCode) return "// Failed to generate problem.";

            var responseString = await response.Content.ReadAsStringAsync();
            var groqResponse = JsonSerializer.Deserialize<GroqApiResponse>(responseString, _jsonOptions);

            return groqResponse?.Choices?.FirstOrDefault()?.Message?.Content ?? "// No problem generated.";
        }

        public async Task<InterviewFeedback> GenerateFeedbackAsync()
        {
            // 1. Create a special "Grader" prompt
            var feedbackPrompt = new
            {
                role = "system",
                content = @"
            The interview is over. You are now a Hiring Manager. 
            Analyze the conversation history. 
            Provide a JSON response in this EXACT format (no markdown, just raw JSON):
            {
                ""codingScore"": (integer 1-10),
                ""communicationScore"": (integer 1-10),
                ""feedbackPoints"": [""point 1"", ""point 2"", ""point 3""]
            }
            Be honest and critical."
            };

            // 2. Temporarily add this instruction to history
            var feedbackHistory = new List<object>(_conversationHistory);
            feedbackHistory.Add(feedbackPrompt);

            // 3. Send to Groq
            var requestData = new
            {
                model = "llama-3.3-70b-versatile", // Use the smart model for grading
                messages = feedbackHistory,
                response_format = new { type = "json_object" }, // Force JSON mode
                temperature = 0.2
            };

            var jsonContent = JsonSerializer.Serialize(requestData, _jsonOptions);
            var httpContent = new StringContent(jsonContent, Encoding.UTF8, "application/json");

            var request = new HttpRequestMessage(HttpMethod.Post, "https://api.groq.com/openai/v1/chat/completions");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);
            request.Content = httpContent;

            var response = await _httpClient.SendAsync(request);
            var responseString = await response.Content.ReadAsStringAsync();

            // 4. Parse the JSON result
            var groqResponse = JsonSerializer.Deserialize<GroqApiResponse>(responseString, _jsonOptions);
            var rawJson = groqResponse?.Choices?.FirstOrDefault()?.Message?.Content ?? "{}";

            try
            {
                var feedback = JsonSerializer.Deserialize<InterviewFeedback>(rawJson, _jsonOptions);
                return feedback ?? new InterviewFeedback { FeedbackPoints = new() { "Error parsing feedback." } };
            }
            catch
            {
                return new InterviewFeedback { CodingScore = 0, CommunicationScore = 0, FeedbackPoints = new() { "AI failed to generate report." } };
            }
        }
    }

    // -- Helper Classes --
    public class GroqApiResponse { public List<GroqChoice> Choices { get; set; } }
    public class GroqChoice { public GroqMessage Message { get; set; } }
    public class GroqMessage { public string Content { get; set; } }
}