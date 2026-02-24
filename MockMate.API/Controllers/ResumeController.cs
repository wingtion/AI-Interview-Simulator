using Microsoft.AspNetCore.Mvc;
using UglyToad.PdfPig;
using System.Text;

namespace MockMate.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ResumeController : ControllerBase
    {
        [HttpPost("upload")]
        public IActionResult UploadResume(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("No file uploaded.");

            if (file.ContentType != "application/pdf")
                return BadRequest("Only PDF files are supported.");

            try
            {
                var extractedText = new StringBuilder();

                // Open the uploaded file stream directly
                using (var stream = file.OpenReadStream())
                using (var document = PdfDocument.Open(stream))
                {
                    // Loop through all pages and extract text
                    foreach (var page in document.GetPages())
                    {
                        extractedText.AppendLine(page.Text);
                    }
                }

                // Clean up the text a bit (remove excessive empty lines)
                var cleanText = string.Join("\n", extractedText.ToString()
                    .Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries)
                    .Select(line => line.Trim())
                    .Where(line => line.Length > 0));

                // Return the raw text to React
                return Ok(new { text = cleanText });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
    }
}