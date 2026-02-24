using Microsoft.AspNetCore.Mvc;
using MockMate.API.Services;

namespace MockMate.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProblemController : ControllerBase
    {
        private readonly IAiService _aiService;

        public ProblemController(IAiService aiService)
        {
            _aiService = aiService;
        }

        [HttpGet("generate")]
        public async Task<IActionResult> GetProblem([FromQuery] string topic = "Arrays", [FromQuery] string difficulty = "Medium")
        {
            var problem = await _aiService.GenerateProblemAsync(topic, difficulty);
            return Ok(new { problem });
        }
    }
}