# Ridhi Sureka — Personal AI Agent

A portfolio website with a resume-grounded conversational agent. The frontend is served by FastAPI, and the chat endpoint uses Groq. The assistant is designed to answer questions about Ridhi's background, projects, experience, skills, and links using `resume.txt` as its source of truth.

## Run locally

Use Python 3.11 or newer. From this directory:

```bash
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -e .
```

Create a `.env` file:

```env
GROQ_API=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-120b
# Set this to the public URL after deployment, e.g. https://your-app.onrender.com/resume.pdf
RESUME_PDF_URL=
```

Start the site:

```bash
uvicorn main:app --reload
```

Open <http://127.0.0.1:8000>. The résumé PDF is served at `/resume.pdf`; the chat agent can share its public link once `RESUME_PDF_URL` is configured.

## Deploy on Render

The included `render.yaml` defines the Python version, build/start commands, health check, and free web service plan.

1. Push this project directory to a GitHub repository.
2. In Render, choose **New → Blueprint**, connect the repository, and apply the `render.yaml` configuration.
3. When prompted, add `GROQ_API` as a secret. Keep it in Render's environment settings; never put it in frontend code or Git. `GROQ_MODEL` defaults to `openai/gpt-oss-120b` and can be changed to another model enabled for your Groq account.
4. Deploy. Check `https://YOUR-SERVICE.onrender.com/api/health` for `{"status":"ok"}` and open the service root. Render sets `RENDER_EXTERNAL_URL`; the app uses it to provide the public résumé PDF URL automatically.

Other hosts that can run a persistent Python web service can use the same build and start commands. The service needs outbound access to Groq's API.

## Notes

- The API key is read only by the Python backend. The browser calls `/api/chat` on the same service.
- `resume.txt` is the assistant's factual source. Update it when profile details change.
- Project cards link to the AutoMind live demo and repository, plus the Adidas Clone and CodeSync live demos.
- The PDF button serves `public/resume.pdf` from this app.
