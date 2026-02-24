using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using MockMate.API.Models;

namespace MockMate.API.Services
{
    public class CodeExecutionService
    {
        private readonly HttpClient _httpClient;
        private readonly string _apiKey;
        private readonly JsonSerializerOptions _jsonOptions;

        public CodeExecutionService(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _apiKey = configuration["GroqApiKey"]; 
            _jsonOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
        }

        public async Task<ExecuteResult> ExecuteCodeAsync(ExecuteRequest request)
        {
            
            var prompt = $@"
You are a code execution engine. 
Your job is to run the following {request.Language} code mentally and output the result.
Rules:
1. Return ONLY the output (stdout).
2. If there are errors, return the error message.
3. Do NOT provide explanations, just the output.
4. If the code has an infinite loop, say 'Error: Timeout'.

Code to execute:{request.Code}
";

            var requestData = new
            {
                model = "llama-3.1-8b-instant", 
                messages = new[]
                {
                    new { role = "system", content = "You are a command line terminal. Output only the result of the code execution." },
                    new { role = "user", content = prompt }
                },
                temperature = 0.0 
            };

            var jsonContent = JsonSerializer.Serialize(requestData, _jsonOptions);
            var httpContent = new StringContent(jsonContent, Encoding.UTF8, "application/json");

            var requestMsg = new HttpRequestMessage(HttpMethod.Post, "https://api.groq.com/openai/v1/chat/completions");
            requestMsg.Headers.Add("Authorization", $"Bearer {_apiKey}");
            requestMsg.Content = httpContent;

            try
            {
                var response = await _httpClient.SendAsync(requestMsg);
                var responseString = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                    return new ExecuteResult { Error = "AI Compiler is busy." };

                var groqResponse = JsonSerializer.Deserialize<GroqApiResponse>(responseString, _jsonOptions);
                var output = groqResponse?.Choices?.FirstOrDefault()?.Message?.Content ?? "";

                
                output = output.Replace("```", "").Trim();

                return new ExecuteResult { Output = output };
            }
            catch (Exception ex)
            {
                return new ExecuteResult { Error = $"Execution Error: {ex.Message}" };
            }
        }
    }
}