using Microsoft.AspNetCore.Mvc;
using MockMate.API.Models;
using MockMate.API.Services;

namespace MockMate.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CodeController : ControllerBase
    {
        private readonly CodeExecutionService _service;

        public CodeController(CodeExecutionService service)
        {
            _service = service;
        }

        [HttpPost("run")]
        public async Task<IActionResult> RunCode([FromBody] ExecuteRequest request)
        {
            var result = await _service.ExecuteCodeAsync(request);
            return Ok(result);
        }
    }
}