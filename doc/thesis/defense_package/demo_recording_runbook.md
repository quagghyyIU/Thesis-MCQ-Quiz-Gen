# QuizGen Demo Recording Runbook

Use this tonight/morning to record the defense backup video. Target length: 6-8 minutes.

Main rule: do not depend on a long live AI generation. Use a prepared generation for the main video. If you want to show the Generate button, do a tiny 3-question live smoke only after the main video is already recorded.

## Recommended Demo Setup

Browser:

- Use Chrome/Edge.
- Zoom: 100% if screen is 1080p or above; 125% if text is too small.
- Use light mode for readability.
- Close notifications.
- Do not show `.env`, API keys, or private terminal logs.

App:

- Backend: `http://localhost:8000`
- Frontend: `http://localhost:3000`
- Backend health: `http://localhost:8000/api/health`
- Login: admin account, because Evaluation tab must be visible.

Prepared data:

- One processed lecture document.
- One exam pattern if available.
- One completed generation named:
  - `Database Fundamentals - Demo Confidence Quiz`
- One submitted attempt for that generation.
- Dashboard has at least one attempt; two or more attempts is better.
- Usage page has some provider/model/API rows.
- Evaluation page has cached baseline results.

## Exact Settings To Use

For main recorded demo:

- Use prepared generation from History or Recent.
- Prepared quiz should have 10 MCQs if available.
- Do not regenerate during the main recording.

If you decide to do a live generation:

- Question count: `3`
- Language: `Auto`
- Difficulty: leave manual off, or use `Easy 40 / Medium 40 / Hard 20`
- Pattern:
  - If you have a related exam pattern: select it.
  - If the only pattern is unrelated to the source document: choose `No pattern`, but briefly open the dropdown to show pattern support.
- Do not use batch generation live.

Why 3 questions for live generation:

- It is fast.
- It reduces provider/API risk.
- It still proves the flow.

Why 10 questions for prepared generation:

- It looks more complete.
- It gives better Dashboard/Bloom breakdown.
- It matches the screenshots and thesis demo style.

## Video Structure

### 0. Start Recording

Start on `/workflow`.

Say:

> This is the demo of QuizGen, my pattern-aware RAG-based MCQ generation and practice platform. I will show the full workflow from lecture material to generated quiz, review, quiz practice, analytics, and evaluation. For defense reliability, I use a prepared generation because live AI calls depend on external providers.

Time: 20 seconds.

## 1. Source Step

Screen: `/workflow`, Source step.

Actions:

1. Show the sidebar with `New quiz`, `History`, `Batch`, `Dashboard`, `Usage`, `Evaluation`, `Settings`.
2. On Source step, select an existing document.
3. Point to:
   - file type
   - language
   - chunk count
4. Do not upload a new big file unless needed.
5. Click `Continue`.

Recommended source:

- Use a database or course lecture document already processed.
- If document names are long, select the clearest one.

Say:

> In the Source step, I select the lecture material. The app supports PDF, DOCX, and PPTX. After upload, the backend extracts text, splits it into overlapping chunks, creates embeddings, and stores them in SQLite for semantic retrieval.

Important wording:

> This is a SQLite-backed embedding store with cosine similarity, not a dedicated vector database.

Time: 45 seconds.

## 2. Pattern Step

Screen: Pattern step.

Actions:

1. Open the pattern dropdown.
2. If you have a relevant pattern, select it.
3. If pattern is unrelated, select `No pattern` but show that pattern selection exists.
4. Set question count:
   - For main video if not generating live: show `10` if already there.
   - For live generation: set `3`.
5. Language:
   - choose `Auto`.
6. Difficulty:
   - Turn manual on only if you want to show the slider.
   - Use `Easy 40 / Medium 40 / Hard 20`.
   - If total is locked at 100%, mention it.
7. Click `Continue`.

Say:

> The Pattern step controls exam style. A user can select an extracted exam pattern or generate without one. The system can also control question count, language, and difficulty distribution. The difficulty slider keeps the total at 100 percent, so the setting remains valid.

If using no pattern:

> In this recording I can still choose No pattern for stability, but the system supports pattern extraction and pattern-aware generation when a relevant past exam is available.

Time: 50 seconds.

## 3. Generate Step

Screen: Generate step.

Actions for safe main video:

1. Show the Current Flow summary.
2. Do not click Generate if you already have a prepared quiz.
3. Say you will open the prepared generation from History/Recent.

Say:

> The Generate step confirms the selected source, pattern, question count, language, and difficulty setup. In a normal run, the backend retrieves top-k relevant chunks, builds the prompt, and sends it through the LLM router. For this recording, I will use a prepared generation to avoid API latency or quota issues.

If doing live generation:

1. Set question count to `3`.
2. Click `Generate`.
3. Wait.
4. If generation takes over 30 seconds, stop waiting and switch to History.

Emergency line:

> Since live generation depends on external providers, I will switch to a prepared generation. The same generation record stores provider, model, prompt version, and configuration snapshot.

Time: 35 seconds.

## 4. Review Generated Quiz

Screen: Review step or `/history` selected generation.

Best option:

- Open prepared quiz from Recent sidebar or History:
  - `Database Fundamentals - Demo Confidence Quiz`
  - or `Database Fundamentals - Print Demo`

Actions:

1. Show quiz title.
2. Show status/completed.
3. Show question count, preferably `10 MCQs`.
4. Scroll through 2 questions only.
5. For one question, point to:
   - topic label
   - Bloom level
   - difficulty
   - answer options
   - explanation
6. Click or show `LLM check` / grounding result if already available.
7. Do not spend too long reading full questions.

Say:

> This is the review screen. Each generated MCQ includes answer options, a correct answer, an explanation, a topic label, difficulty, and Bloom level. The grounding check is a review signal that compares the question with source chunks. It does not prove the question is perfect, but it helps identify weakly grounded questions.

Important:

- Do not say users can edit distractors inline.
- Say lecturers review/export/regenerate/approve.

Say:

> The system drafts the questions, but the lecturer still verifies them before formal use.

Time: 75 seconds.

## 5. Quiz Practice

Screen: `/quiz/[genId]`.

Actions:

1. Click `Practice` or `Start Quiz`.
2. Start the quiz.
3. Answer 3-5 questions quickly.
4. If there are 10 questions, you can answer only some and submit if the app allows partial answers.
5. Use Next/Previous once to show navigation.
6. Submit.

Recommended answering strategy:

- Do not try to get 100%.
- Mixed answers are okay because they make review and dashboard more meaningful.
- If you need speed, choose first option for several questions.

Say:

> The generated output becomes an interactive quiz. The user can answer questions, navigate between them, submit, and receive a score. This turns AI-generated text into a practice artifact.

Time: 60-90 seconds.

## 6. Attempt Review

Screen: `/quiz/attempt/[attemptId]`.

Actions:

1. Open the submitted attempt result or an existing attempt.
2. Show:
   - score
   - correct count
   - time taken
   - submitted answer
   - correct answer
   - explanation
   - Bloom label
   - topic label
3. Run LLM check only if it is already fast/stable. Otherwise skip.

Say:

> Each attempt is stored and can be reopened later. This supports review after practice, because the learner can see their answer, the correct answer, the explanation, and the related Bloom level and topic.

Time: 45 seconds.

## 7. History

Screen: `/history`.

Actions:

1. Open History.
2. Select the demo generation.
3. Show:
   - saved title
   - completed status
   - generated questions
   - recent attempts if visible
   - actions: evaluate/export/start quiz
4. Do not rename live unless necessary.

Say:

> History keeps generated quizzes after the workflow is finished. The user can reopen, rename, export, evaluate, or start practice from saved generations.

Time: 35 seconds.

## 8. Dashboard

Screen: `/dashboard`.

Actions:

1. Show KPI cards:
   - total attempts
   - average score
   - best score
   - accuracy
2. Show confidence trend.
3. Show recent attempts.
4. Show Bloom breakdown.
5. Show topic mastery.
6. If a weak topic exists, point to `Practice topic`, but do not generate live unless needed.

Say:

> The dashboard closes the loop. It summarizes practice progress with score trends, recent attempts, Bloom breakdown, and topic mastery. Weak topics can be used to create focused practice from the same source material.

Important wording:

> This is attempt-based practice progress, not a full psychometric measurement of student ability.

Time: 60 seconds.

## 9. Usage

Screen: `/usage`.

Actions:

1. Show token totals.
2. Show provider/model breakdown.
3. Show recent API calls.
4. Show status/latency/provider/model fields.
5. Mention fallback attempt index if visible.

Say:

> Usage makes the AI layer transparent. The app records provider, model, call type, status, latency, token usage, and fallback attempts. This matters because external providers can fail, hit quota, or change behavior.

Time: 35 seconds.

## 10. Settings

Screen: `/settings`.

Actions:

1. Show configured models.
2. Show fallback chain.
3. Show RAG configuration:
   - chunk size
   - chunk overlap
   - retrieval top-k
   - embedding model
4. Show OpenRouter free priority if visible.

Say:

> The Settings page shows the live configuration. The app is not locked to only one provider. It uses a provider router and can fall back across configured models.

Time: 30 seconds.

## 11. Evaluation

Screen: `/evaluation`.

Actions:

1. Open Evaluation as admin.
2. Show latest table.
3. Point to the three baselines:
   - Vanilla
   - RAG-only
   - Full system
4. Mention the three main numbers.

Say:

> The evaluation compares three core baselines: vanilla prompting, RAG-only, and the full system. RAG improves semantic grounding from about 0.7912 to 0.9369. The full system reduces Bloom KL from about 11.6357 to 3.9054, and has the strongest judge score, around 4.0750.

Say this too:

> I do not rerun the full evaluation live because provider outputs can change. The thesis reports cached reproducible evaluation artifacts.

Time: 60 seconds.

## 12. Closing

Screen: stay on Evaluation or return to Dashboard.

Say:

> In summary, QuizGen demonstrates a complete pipeline from lecture materials to generated MCQs, review, quiz practice, analytics, and evaluation. RAG improves grounding, while pattern and Bloom conditioning improve exam-style alignment. The system is still a thesis-scale prototype, so lecturer review remains required.

Time: 20 seconds.

## Total Time Target

- Intro: 20s
- Source: 45s
- Pattern: 50s
- Generate explanation: 35s
- Review: 75s
- Quiz practice: 75s
- Attempt review: 45s
- History: 35s
- Dashboard: 60s
- Usage: 35s
- Settings: 30s
- Evaluation: 60s
- Closing: 20s

Total: about 8 minutes.

If you need 5 minutes, skip:

- live generate
- History
- Settings
- long quiz answering

## Exact Click Plan

1. Open `http://localhost:3000`.
2. Login as admin.
3. Go to `New quiz` / `/workflow`.
4. Source:
   - select existing document.
   - click `Continue`.
5. Pattern:
   - open pattern dropdown.
   - choose relevant pattern if available, otherwise `No pattern`.
   - question count:
     - `10` if only showing setup/prepared generation.
     - `3` if live generating.
   - language: `Auto`.
   - difficulty:
     - optional manual on.
     - `Easy 40`, `Medium 40`, `Hard 20`.
   - click `Continue`.
6. Generate:
   - show summary.
   - if live: click `Generate`.
   - if safe demo: go to Recent/History and open prepared generation.
7. Review:
   - show title.
   - show 2 questions.
   - show grounding/LLM check if ready.
   - click `Practice`.
8. Quiz:
   - answer 3-5 questions.
   - click Next/Prev once.
   - submit.
9. Attempt review:
   - show score and explanations.
10. History:
   - open History.
   - select same generation.
11. Dashboard:
   - open Dashboard.
   - show trend/Bloom/topic mastery.
12. Usage:
   - show provider/model/status/token.
13. Settings:
   - show fallback chain/RAG config.
14. Evaluation:
   - show baseline results.
15. Stop recording.

## Things Not To Say

Avoid:

- "This is a vector database."
- "The app fixes hallucination."
- "The answers are guaranteed correct."
- "The Bloom labels are human verified."
- "This replaces lecturers."
- "The app edits distractors inline."

Say instead:

- "SQLite-backed embedding store."
- "Reduces source drift."
- "Grounding proxy / review signal."
- "Model-generated Bloom metadata."
- "Lecturer review is still required."
- "Drafting and practice-support tool."

## Backup If Something Fails

If login fails:

> I will use the recorded video because the local session has an auth issue.

If generation fails:

> This depends on external providers, so I will open the prepared generation from History.

If Usage is empty:

> Usage normally records provider/model/status/token calls. This demo database may not have many rows after reset.

If Evaluation does not load:

> The cached evaluation artifacts are also saved under `eval/results/`, and the thesis reports those values.

If video is too long:

> Cut after Evaluation. Do not show Batch unless specifically needed.

## Word-For-Word Speaking Script By Step

Use this if you want to read while recording. Speak naturally, but keep the meaning.

### Step 0 - Opening

Screen: `/workflow`

Say:

> This is the demo of QuizGen, my pattern-aware RAG-based MCQ generation and practice platform. In this video, I will show the complete workflow from lecture material to generated questions, review, quiz practice, analytics, and evaluation.
>
> Because the generation step depends on external AI providers, I use a prepared generation for this recording. This makes the demo stable, while still showing the same workflow and stored results.

### Step 1 - Source

Screen: Workflow Source step.

Click:

- Select one processed lecture document.
- Click `Continue`.

Say:

> First, I choose the source lecture material. QuizGen supports PDF, DOCX, and PPTX files.
>
> After upload, the backend extracts the text, cleans it, splits it into overlapping chunks, and creates embeddings. These chunks are stored in SQLite and later used for semantic retrieval.
>
> In my thesis, this is the RAG foundation. The generated questions are guided by retrieved lecture content instead of relying only on the general knowledge of the model.

If asked or if you want to mention storage:

> This is not a dedicated vector database. It is a SQLite-backed embedding store with cosine similarity retrieval, which is enough for the thesis-scale prototype.

### Step 2 - Pattern And Difficulty

Screen: Workflow Pattern step.

Click:

- Open pattern dropdown.
- Choose relevant pattern if available, otherwise choose `No pattern`.
- Set questions to `10` for prepared demo or `3` for live demo.
- Set language to `Auto`.
- If showing manual difficulty, use `Easy 40`, `Medium 40`, `Hard 20`.
- Click `Continue`.

Say:

> Next is the Pattern step. Here, the user can select an optional exam pattern extracted from previous exam questions.
>
> The pattern helps the model follow the expected exam style, while the difficulty or Bloom controls help guide the cognitive level of the generated question set.
>
> For the demo, I keep the language as Auto. If I use manual difficulty, I use a simple distribution: 40 percent easy, 40 percent medium, and 20 percent hard. The slider keeps the total at 100 percent, so the setting remains valid.

If no pattern is selected:

> I am using No pattern here for stability, but the app supports pattern-aware generation when a relevant past exam pattern is selected.

### Step 3 - Generate Setup

Screen: Workflow Generate step.

Click:

- Show current setup.
- If not live generating, go to History/Recent.
- If live generating, click `Generate` only with `3` questions.

Say:

> This Generate step confirms the source, pattern, number of questions, language, and difficulty setup.
>
> In a normal run, the backend retrieves the top-k relevant chunks, builds a prompt with the source context and optional pattern, and sends it through the LLM router.
>
> The router can use configured providers such as Groq, OpenRouter, Gemini paths, or local Ollama. For this recording, I will open a prepared generation to avoid external API delay.

If live generation works:

> The generation is complete, and the app now moves to Review.

If live generation is slow:

> Since this step depends on external AI providers, I will switch to a prepared generation from History. The prepared record still contains the generated questions and provider information.

### Step 4 - Review Generated MCQs

Screen: Review step or selected History generation.

Click:

- Open `Database Fundamentals - Demo Confidence Quiz`.
- Show 1-2 generated questions.
- Show topic, Bloom, difficulty, options, answer, explanation.
- Show grounding/LLM check if already available.

Say:

> This is the Review screen. The generated output is structured as MCQs, not plain text only.
>
> Each question has answer options, the correct answer, an explanation, a topic label, difficulty, and Bloom level. These fields make the result usable for review, export, quiz practice, and analytics.
>
> The grounding check is a review signal. It compares the generated question with retrieved source chunks and highlights whether the question is well grounded, partially grounded, or weakly grounded.
>
> This does not guarantee that every question is perfect. It helps the lecturer identify which questions need closer review.

Important line:

> QuizGen drafts the questions, but the lecturer still has the final responsibility to verify them before formal exam use.

### Step 5 - Start Quiz Practice

Screen: `/quiz/[genId]`

Click:

- Click `Practice` or `Start Quiz`.
- Answer 3-5 questions.
- Use Next/Previous once.
- Submit.

Say:

> After review, the generated questions become an interactive quiz. This is important because the system is not only generating content; it also supports practice.
>
> The student can answer questions, move between them, and submit the attempt. The app then records the selected answers, score, correct count, and time taken.

While answering:

> I will answer a few questions quickly. The goal here is to demonstrate the workflow, not to get a perfect score.

Before submit:

> Now I submit the quiz so the attempt can be stored and reviewed.

### Step 6 - Attempt Result And Review

Screen: submitted quiz result or `/quiz/attempt/[attemptId]`.

Click:

- Show score.
- Show correct/incorrect answers.
- Show explanation and Bloom/topic labels.

Say:

> After submission, the app shows the result. The user can see the score, correct count, and per-question feedback.
>
> A saved attempt can also be reopened later. In the attempt review, the student can compare their answer with the correct answer and read the explanation.
>
> This turns the generated quiz into a learning object, not just a static set of AI-generated questions.

### Step 7 - History

Screen: `/history`

Click:

- Open History.
- Select the demo generation.
- Show actions: evaluate/export/start quiz.

Say:

> The History page stores previous generations. This is useful because users may generate many quizzes from the same document.
>
> From here, a user can reopen a quiz, rename it, export it, evaluate grounding, or start practice again.
>
> This also supports reproducibility because each generation is saved with its status, questions, and metadata.

### Step 8 - Dashboard

Screen: `/dashboard`

Click:

- Show KPI cards.
- Show confidence trend.
- Show recent attempts.
- Show Bloom breakdown.
- Show topic mastery.

Say:

> The Dashboard closes the learning loop. It summarizes the user's practice progress through total attempts, average score, best score, and accuracy.
>
> The confidence trend shows score progression across attempts. The Bloom breakdown shows performance by cognitive level.
>
> The topic mastery section groups performance by topic labels. If a topic is weak, the app can create focused practice from the same source document.

Important line:

> This is attempt-based progress tracking, not a full psychometric measurement of ability.

### Step 9 - Usage Telemetry

Screen: `/usage`

Click:

- Show provider/model breakdown.
- Show recent calls.
- Show status/latency/token usage.

Say:

> The Usage page makes the AI layer transparent. It records provider, model, call type, status, latency, token usage, and fallback attempts.
>
> This matters because external AI providers can fail, become slow, or hit quota. Instead of hiding that, QuizGen records the behavior so it can be inspected.

### Step 10 - Settings

Screen: `/settings`

Click:

- Show configured models.
- Show fallback chain.
- Show RAG config.

Say:

> The Settings page shows the live server configuration. It includes configured models, fallback order, and RAG parameters such as chunk size, chunk overlap, and retrieval top-k.
>
> This also shows that the implementation is provider-aware. It is not locked to one model provider.

### Step 11 - Evaluation Dashboard

Screen: `/evaluation`

Click:

- Open Evaluation.
- Show latest results.
- Point to Vanilla, RAG-only, Full system.

Say:

> Finally, the Evaluation page shows the thesis evaluation results.
>
> I compare three core baselines. Vanilla prompting is the raw LLM baseline without retrieval or pattern. RAG-only adds retrieved lecture chunks. The full system adds retrieval, exam-pattern examples, and Bloom control.
>
> The main result is that RAG improves semantic grounding from about 0.7912 to 0.9369. The full system reduces Bloom KL from about 11.6357 to 3.9054, which means it follows the target Bloom distribution better.
>
> The full system also has the strongest judge score, around 4.0750.

Important line:

> I do not rerun the full evaluation live because provider outputs can change. The thesis reports cached reproducible evaluation artifacts.

### Step 12 - Closing

Screen: Dashboard or Evaluation.

Say:

> In summary, QuizGen demonstrates a complete pipeline from lecture material to generated MCQs, review, quiz practice, analytics, and evaluation.
>
> RAG improves source grounding, while pattern and Bloom conditioning improve exam-style alignment. The system is still a thesis-scale prototype, so human review remains required before formal exam use.

Then stop recording.

## Super Short Voiceover If You Need 3 Minutes

Use this if your recording is getting too long:

> QuizGen is a pattern-aware RAG-based MCQ generation and practice platform. The system starts from lecture documents, extracts and chunks the text, creates embeddings, and retrieves relevant chunks for generation.
>
> The user can optionally select an exam pattern and difficulty distribution. The generated MCQs include answer options, correct answer, explanation, topic, difficulty, and Bloom labels.
>
> The review screen provides grounding signals, but the system does not replace lecturer review. After review, the quiz can be practiced interactively, and attempts are stored for later review.
>
> The dashboard tracks attempts, confidence trend, Bloom breakdown, and topic mastery. Usage records provider, model, token usage, latency, and fallback attempts.
>
> In evaluation, RAG improves semantic grounding from 0.7912 to 0.9369. The full system improves Bloom alignment by reducing Bloom KL from 11.6357 to 3.9054 and has the strongest judge score. This shows that retrieval improves source grounding, while pattern and Bloom conditioning improve exam-style control.
