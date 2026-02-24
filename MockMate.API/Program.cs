using MockMate.API.Hubs;
using MockMate.API.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddSignalR(); // Enable SignalR

builder.Services.AddHttpClient();

builder.Services.AddScoped<IAiService, GroqAiService>();

builder.Services.AddScoped<CodeExecutionService>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("ReactPolicy", policy =>
    {
        policy.WithOrigins("http://localhost:5173") // The default Vite/React port
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials(); // Required for SignalR
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
app.UseHttpsRedirection();

app.UseCors("ReactPolicy"); // Activate CORS

app.MapControllers();
app.MapHub<InterviewHub>("/interviewHub"); // The URL will be https://localhost:xxxx/interviewHub

app.Run();