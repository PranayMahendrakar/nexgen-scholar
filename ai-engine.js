// ══════════════════════════════════════════════════════════════════
// 🤖 NEXGEN SCHOLAR — COMPLETE AI ENGINE
// All OpenAI API interactions for every feature in the blueprint
// ══════════════════════════════════════════════════════════════════

class AIEngine {
  constructor() {
    const c = window.APP_CONFIG?.openai || {};
    this.key = c.apiKey || '';
    this.model = c.model || 'gpt-4o';
    this.mini = c.modelMini || 'gpt-4o-mini';
    this.ok = this.key && this.key !== 'YOUR_OPENAI_API_KEY';
    this.history = [];
    this.lang = window.APP_CONFIG?.app?.defaultLanguage || 'en';
  }

  async call(msgs, opt = {}) {
    if (!this.ok) return this._mock(msgs);
    try {
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.key}` },
        body: JSON.stringify({ model: opt.mini ? this.mini : this.model, messages: msgs, temperature: opt.temp ?? 0.7, max_tokens: opt.max ?? 3000, ...(opt.json ? { response_format: { type: 'json_object' } } : {}) })
      });
      if (!r.ok) throw new Error((await r.json()).error?.message || 'API error');
      return (await r.json()).choices[0].message.content;
    } catch (e) { console.error('AI:', e); return this._mock(msgs); }
  }

  jp(raw) { try { return JSON.parse(raw); } catch { try { return JSON.parse(raw.replace(/```json|```/g, '').trim()); } catch { return null; } } }

  // ═══════════════════════════════════════════════════════════
  // PART 1: AI PERSONALIZATION ENGINE
  // ═══════════════════════════════════════════════════════════

  // 1.1 Cognitive Diagnostic Question Generator
  async cognitiveQuestion(subject, prev = [], qNum = 1) {
    const r = await this.call([
      { role: 'system', content: `You are a cognitive assessment expert. Generate 1 adaptive diagnostic question for ${subject}. This is question ${qNum}/10. Adapt difficulty based on previous answers. Return ONLY JSON:
{"question":"...","type":"mcq","options":["A)...","B)...","C)...","D)..."],"correct":0,"bloomLevel":"remember|understand|apply|analyze|evaluate|create","difficulty":"easy|medium|hard|expert","subTopic":"...","cognitiveSkill":"visual|textual|auditory|abstract|concrete|sequential|global|active|reflective","explanation":"...","timeExpected":30}
${prev.length ? 'Previous: ' + prev.map(a => `${a.topic}:${a.correct ? '✓' : '✗'}(${a.time}s)`).join(', ') : 'First question — medium difficulty.'}` },
      { role: 'user', content: `Diagnostic Q${qNum} for ${subject}` }
    ], { json: true, mini: true });
    return this.jp(r) || this._mockDiagQ(subject, qNum);
  }

  // 1.1 Build Complete Cognitive Profile from answers
  async buildCognitiveProfile(answers) {
    const r = await this.call([
      { role: 'system', content: `Analyze diagnostic results and build a cognitive learner profile. Return ONLY JSON:
{"learningStyle":{"primary":"visual|textual|auditory","secondary":"...","reasoning":"abstract|concrete","processing":"sequential|global","engagement":"active|reflective"},"knowledgeBaseline":{"overall":"beginner|intermediate|advanced|expert","bySubject":{}},"bloomLevel":"remember|understand|apply|analyze|evaluate|create","pace":"slow|moderate|fast|accelerated","languageProficiency":"basic|intermediate|advanced|native","optimalSessionLength":25,"bestStudyTime":"morning|afternoon|evening","recommendedExplanationStyle":"formal|conversational|story-based|analogy-heavy|code-driven|visual-first","strengths":["..."],"weaknesses":["..."],"personalizedTip":"..."}` },
      { role: 'user', content: JSON.stringify(answers) }
    ], { json: true });
    return this.jp(r) || this._mockProfile();
  }

  // 1.2 Adaptive Content — Adjust explanation based on profile
  async adaptContent(topic, profile, style = 'auto') {
    const s = style === 'auto' ? profile?.recommendedExplanationStyle || 'conversational' : style;
    return await this.call([
      { role: 'system', content: `Explain "${topic}" using ${s} style. Student profile: Level=${profile?.bloomLevel||'understand'}, Style=${profile?.learningStyle?.primary||'visual'}, Pace=${profile?.pace||'moderate'}. Adapt vocabulary, examples, and depth accordingly. Use analogies from student's interests if known.` },
      { role: 'user', content: `Explain: ${topic}` }
    ]);
  }

  // 1.3 Sentiment Detection
  async detectSentiment(message) {
    const r = await this.call([
      { role: 'system', content: 'Analyze student message sentiment. Return ONLY JSON: {"sentiment":"frustrated|confused|bored|excited|neutral|anxious|confident","confidence":0.85,"suggestedTone":"encouraging|challenging|calming|celebratory|empathetic|normal","nudge":"...personalized motivational message..."}' },
      { role: 'user', content: message }
    ], { json: true, mini: true });
    return this.jp(r) || { sentiment: 'neutral', confidence: 0.5, suggestedTone: 'normal', nudge: '' };
  }

  // 1.3 Burnout Detection
  async checkBurnout(sessionData) {
    const r = await this.call([
      { role: 'system', content: 'Analyze study session data for burnout signs. Return ONLY JSON: {"burnoutRisk":"low|medium|high|critical","signs":["..."],"recommendation":"...","suggestedAction":"continue|break|switch_subject|lighter_content|stop_for_today","breakActivity":"...fun suggestion..."}' },
      { role: 'user', content: JSON.stringify(sessionData) }
    ], { json: true, mini: true });
    return this.jp(r) || { burnoutRisk: 'low', signs: [], recommendation: 'You\'re doing great!', suggestedAction: 'continue' };
  }

  // ═══════════════════════════════════════════════════════════
  // PART 2: AI TUTOR 2.0
  // ═══════════════════════════════════════════════════════════

  // 2.1 & 2.2 Multi-Modal Tutor Chat (3 modes)
  async tutorChat(msg, mode = 'direct', profile = null, lang = 'en') {
    const sys = {
      socratic: `You are a Socratic AI tutor. NEVER give direct answers. Guide through discovery questions. Break complex problems into smaller discoverable steps. Be encouraging. After 3 hints without progress, give a stronger clue. Track the reasoning chain.`,
      direct: `You are an expert AI tutor. Provide clear, comprehensive explanations with examples, analogies, step-by-step breakdowns, relevant formulas, and real-world applications. Be thorough but accessible.`,
      comprehensive: `You are in "Show Me Everything" mode. For every topic provide: 1) Simple definition 2) Intuitive explanation 3) Formal definition 4) Multiple examples (easy→hard) 5) Common mistakes & misconceptions 6) Related concepts 7) Exam tips 8) Practice problems with solutions 9) Real-world applications 10) Memory aids/mnemonics.`
    }[mode] || '';
    const profileCtx = profile ? `\nStudent: Style=${profile.learningStyle?.primary||'visual'}, Level=${profile.bloomLevel||'understand'}, Pace=${profile.pace||'moderate'}, Explain=${profile.recommendedExplanationStyle||'analogy-heavy'}` : '';
    const langCtx = lang !== 'en' ? `\nRespond in ${lang}. Use code-switching with English technical terms where appropriate.` : '';

    this.history.push({ role: 'user', content: msg });
    const reply = await this.call([
      { role: 'system', content: sys + profileCtx + langCtx + '\nUse markdown formatting. Include emojis sparingly for engagement.' },
      ...this.history.slice(-24)
    ]);
    this.history.push({ role: 'assistant', content: reply });
    return reply;
  }

  // 2.1 Analyze uploaded image/photo
  async analyzeImage(base64, prompt = 'Analyze this and explain') {
    if (!this.ok) return 'Image analysis requires an OpenAI API key configured in config.js. The AI would analyze your uploaded image — whether it\'s a textbook page, handwritten equation, graph, or diagram — and provide explanations, corrections, or solutions.';
    try {
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.key}` },
        body: JSON.stringify({ model: this.model, messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } }] }], max_tokens: 2000 })
      });
      return (await r.json()).choices[0].message.content;
    } catch (e) { return 'Error analyzing image: ' + e.message; }
  }

  // 2.3 Debate Mode
  async debateResponse(topic, studentPosition, round = 1) {
    return await this.call([
      { role: 'system', content: `You are in Academic Debate Mode. Take the OPPOSITE position to the student on "${topic}". Round ${round}/5. Present structured counter-arguments with evidence. Be intellectually rigorous but respectful. End with a pointed question that challenges their reasoning. After round 5, provide a debate summary with strengths/weaknesses of both sides.` },
      { role: 'user', content: studentPosition }
    ]);
  }

  clearHistory() { this.history = []; }

  // ═══════════════════════════════════════════════════════════
  // PART 3: CONTENT ECOSYSTEM
  // ═══════════════════════════════════════════════════════════

  // 3.1 Document → Full Course Generation
  async processDocument(text, title = 'Document') {
    const r = await this.call([
      { role: 'system', content: `Process educational text into comprehensive learning materials. Return ONLY JSON:
{"title":"...","summary":"5-sentence summary","keyDefinitions":[{"term":"...","definition":"..."}],"chapterOutline":[{"title":"...","objectives":["..."]}],"flashcards":[{"front":"...","back":"..."}],"mcqs":[{"q":"...","opts":["A)...","B)...","C)...","D)..."],"ans":0,"exp":"...","bloom":"remember|understand|apply|analyze"}],"shortAnswerQs":[{"q":"...","modelAns":"...","marks":5}],"longAnswerQs":[{"q":"...","outline":"...","marks":10}],"conceptMap":{"central":"...","branches":[{"name":"...","children":["..."]}]},"examTips":["..."],"audioScript":"...narration script...","difficulty":"beginner|intermediate|advanced"}` },
      { role: 'user', content: `Process:\n\n${text.slice(0, 10000)}` }
    ], { json: true });
    return this.jp(r) || this._mockDoc(title);
  }

  // 3.2 AI Lesson Generator (for educators)
  async generateLesson(curriculum, grade, chapter, board = 'CBSE') {
    const r = await this.call([
      { role: 'system', content: `Generate a complete curriculum-aligned lesson plan. Return ONLY JSON:
{"lessonTitle":"...","grade":"${grade}","board":"${board}","duration":"45 min","objectives":["..."],"warmUp":{"activity":"...","duration":"5 min"},"mainLesson":{"beginner":"...","intermediate":"...","advanced":"..."},"exercises":[{"type":"individual|pair|group","activity":"...","duration":"..."}],"formativeAssessment":{"questions":["..."],"rubric":"..."},"homework":"...","teacherNotes":"...","differentiatedVersions":{"advanced":"...","support":"...","ell":"...for English Language Learners"},"bloomQuestions":{"remember":["..."],"understand":["..."],"apply":["..."],"analyze":["..."],"evaluate":["..."],"create":["..."]},"resources":["..."]}` },
      { role: 'user', content: `${board} Grade ${grade}: ${curriculum} — ${chapter}` }
    ], { json: true });
    return this.jp(r) || this._mockLesson(chapter);
  }

  // 3.3 Video Summarizer
  async summarizeVideo(transcript, title = 'Video') {
    const r = await this.call([
      { role: 'system', content: `Summarize educational video content. Return ONLY JSON:
{"title":"...","summary":"...","chapters":[{"timestamp":"0:00","title":"...","keyPoints":["..."]}],"keyTakeaways":["..."],"conceptMap":{"central":"...","branches":[{"name":"...","children":["..."]}]},"quiz":[{"q":"...","opts":["..."],"ans":0}],"examRelevant":["...marked as important for exams..."]}` },
      { role: 'user', content: `Summarize: ${title}\n\n${transcript.slice(0, 8000)}` }
    ], { json: true });
    return this.jp(r) || { title, summary: 'Video summary would appear here', chapters: [], keyTakeaways: [], quiz: [] };
  }

  // ═══════════════════════════════════════════════════════════
  // PART 4: ASSESSMENT ENGINE
  // ═══════════════════════════════════════════════════════════

  // 4.1 Generate Full Exam Paper
  async generateExam(subject, topics, config = {}) {
    const r = await this.call([
      { role: 'system', content: `Generate a complete exam paper. Return ONLY JSON:
{"title":"...","subject":"${subject}","totalMarks":${config.totalMarks||100},"duration":"${config.duration||'3 hours'}","sections":[{"name":"Section A - MCQ","marks":${config.mcqMarks||20},"questions":[{"q":"...","opts":["..."],"ans":0,"marks":1,"bloom":"..."}]},{"name":"Section B - Short Answer","marks":${config.shortMarks||30},"questions":[{"q":"...","modelAns":"...","marks":3,"bloom":"..."}]},{"name":"Section C - Long Answer","marks":${config.longMarks||50},"questions":[{"q":"...","outline":"...","marks":10,"bloom":"..."}]}],"markingScheme":"...","difficultyDistribution":{"easy":30,"medium":50,"hard":20},"bloomDistribution":{"remember":15,"understand":25,"apply":25,"analyze":20,"evaluate":10,"create":5}}
Ensure: syllabus coverage, zero repetition, proper difficulty & Bloom's distribution, anti-guessing near-miss wrong answers.` },
      { role: 'user', content: `Subject: ${subject}\nTopics: ${topics.join(', ')}` }
    ], { json: true });
    return this.jp(r) || this._mockExam(subject);
  }

  // 4.1 Adaptive Quiz
  async generateQuiz(topic, count = 5, diff = 'medium', bloom = 'mixed') {
    const r = await this.call([
      { role: 'system', content: `Generate ${count} MCQ questions about "${topic}" at ${diff} difficulty${bloom !== 'mixed' ? `, Bloom's level: ${bloom}` : ', mixed Bloom\'s levels'}. Return ONLY JSON:
{"questions":[{"id":1,"q":"...","opts":["A)...","B)...","C)...","D)..."],"ans":0,"exp":"...","bloom":"remember|understand|apply|analyze|evaluate|create","subTopic":"...","difficulty":"${diff}"}]}
Make wrong answers plausible near-misses that test genuine understanding.` },
      { role: 'user', content: `Generate ${count} ${diff} MCQs: ${topic}` }
    ], { json: true, mini: diff === 'easy' });
    return this.jp(r) || this._mockQuiz(topic, count);
  }

  // 4.2 Essay Grading
  async gradeEssay(essay, topic = '', rubric = '') {
    const r = await this.call([
      { role: 'system', content: `Grade this essay rigorously. Return ONLY JSON:
{"score":0,"maxScore":100,"breakdown":{"content":{"score":0,"max":30,"feedback":"..."},"structure":{"score":0,"max":25,"feedback":"..."},"language":{"score":0,"max":25,"feedback":"..."},"originality":{"score":0,"max":20,"feedback":"..."}},"keywordCoverage":["...found..."],"keywordsMissing":["...expected but missing..."],"overallFeedback":"...","strengths":["..."],"improvements":["..."],"modelAnswer":"...brief ideal answer outline...","plagiarismRisk":"low|medium|high","gradeEquivalent":"A+|A|B+|B|C+|C|D|F"}
${rubric ? 'Rubric: ' + rubric : ''} ${topic ? 'Topic: ' + topic : ''}` },
      { role: 'user', content: essay }
    ], { json: true });
    return this.jp(r) || this._mockGrade();
  }

  // 4.3 Infinite Problem Generator
  async generateProblems(topic, count = 5, difficulty = 'medium') {
    const r = await this.call([
      { role: 'system', content: `Generate ${count} practice problems for "${topic}" at ${difficulty} level. Return ONLY JSON:
{"problems":[{"id":1,"problem":"...","hints":["hint1","hint2","hint3"],"solution":{"steps":["Step 1: ...","Step 2: ..."],"finalAnswer":"..."},"difficulty":"${difficulty}","estimatedTime":"5 min","commonMistakes":["..."]}]}` },
      { role: 'user', content: `${count} ${difficulty} problems: ${topic}` }
    ], { json: true, mini: true });
    return this.jp(r) || this._mockProblems(topic, count);
  }

  // 4.3 Error Pattern Analysis
  async analyzeErrors(errorLog) {
    const r = await this.call([
      { role: 'system', content: `Analyze student error patterns. Return ONLY JSON:
{"errorDNA":[{"pattern":"...description of recurring mistake...","frequency":"high|medium|low","topic":"...","rootCause":"...","remediation":"...specific fix..."}],"overallAnalysis":"...","strongAreas":["..."],"criticalGaps":["..."],"recommendedPractice":[{"topic":"...","type":"...","count":5}],"motivationalInsight":"...positive framing..."}` },
      { role: 'user', content: JSON.stringify(errorLog) }
    ], { json: true, mini: true });
    return this.jp(r) || { errorDNA: [], overallAnalysis: 'Need more data', strongAreas: [], criticalGaps: [], recommendedPractice: [] };
  }

  // 4.1 Predictive Score
  async predictScore(history, subject) {
    const r = await this.call([
      { role: 'system', content: `Predict exam score from quiz history. Return ONLY JSON:
{"predicted":{"low":0,"high":0,"likely":0},"confidence":"high|medium|low","strengths":["..."],"weaknesses":["..."],"focusAreas":[{"topic":"...","priority":"critical|high|medium","hoursNeeded":2}],"studyPlan48hr":"...what to focus in next 48 hours...","motivation":"...specific encouraging message..."}` },
      { role: 'user', content: `${subject}: ${JSON.stringify(history)}` }
    ], { json: true, mini: true });
    return this.jp(r) || { predicted: { low: 65, high: 80, likely: 72 }, confidence: 'medium', strengths: ['Basics'], weaknesses: ['Advanced'], focusAreas: [], studyPlan48hr: 'Review weak topics', motivation: 'You\'re on track!' };
  }

  // ═══════════════════════════════════════════════════════════
  // PART 5: COMMUNICATION & SOFT SKILLS
  // ═══════════════════════════════════════════════════════════

  // 5.1 Presentation Coach — Generate slides
  async generatePresentation(topic, slides = 8) {
    const r = await this.call([
      { role: 'system', content: `Create a presentation outline with ${slides} slides. Return ONLY JSON:
{"title":"...","slides":[{"slideNum":1,"title":"...","bulletPoints":["..."],"speakerNotes":"...","visualSuggestion":"...","transitionTip":"..."}],"overallTips":["..."],"estimatedDuration":"${slides * 2} minutes","audienceEngagementTips":["..."]}` },
      { role: 'user', content: `Presentation: ${topic}` }
    ], { json: true });
    return this.jp(r) || this._mockPresentation(topic, slides);
  }

  // 5.1 Evaluate presentation delivery
  async evaluatePresentation(transcript, duration) {
    const r = await this.call([
      { role: 'system', content: `Evaluate presentation delivery. Return ONLY JSON:
{"overallScore":0,"breakdown":{"content":{"score":0,"max":25,"feedback":"..."},"structure":{"score":0,"max":25,"feedback":"..."},"delivery":{"score":0,"max":25,"feedback":"..."},"engagement":{"score":0,"max":25,"feedback":"..."}},"fillerWords":{"count":0,"examples":["um","like"]},"paceAnalysis":"too_fast|good|too_slow","improvements":["..."],"strengths":["..."]}` },
      { role: 'user', content: `Duration: ${duration}s\n${transcript}` }
    ], { json: true, mini: true });
    return this.jp(r) || { overallScore: 70, breakdown: {}, fillerWords: { count: 0 }, improvements: ['Practice more'], strengths: ['Good content'] };
  }

  // 5.2 Academic Writing Assistant
  async writingAssist(text, task = 'improve') {
    const tasks = {
      improve: 'Improve this academic writing. Suggest better structure, stronger arguments, clearer language, and proper academic tone.',
      thesis: 'Help formulate a strong thesis statement from this draft.',
      paraphrase: 'Paraphrase this text maintaining academic tone. Provide 3 versions.',
      citation: 'Identify claims that need citations and suggest where to find sources.',
      abstract: 'Generate an abstract for this paper (150-250 words).',
      outline: 'Create a detailed paper outline from this draft.'
    };
    return await this.call([
      { role: 'system', content: `You are an academic writing expert. ${tasks[task] || tasks.improve} Provide specific, actionable feedback.` },
      { role: 'user', content: text }
    ]);
  }

  // 5.3 Mock Interview
  async interviewQuestion(role, domain, round = 1, prevAnswers = []) {
    const r = await this.call([
      { role: 'system', content: `You are interviewing for: ${role} (${domain}). Round ${round}. Generate next interview question based on previous answers. Return ONLY JSON:
{"question":"...","type":"technical|behavioral|situational|case_study","difficulty":"easy|medium|hard","expectedDuration":"2 min","evaluationCriteria":["..."],"followUpHint":"...what interviewer is looking for..."}
${prevAnswers.length ? 'Previous Q&As: ' + JSON.stringify(prevAnswers.slice(-3)) : 'Start with an ice-breaker, then escalate.'}` },
      { role: 'user', content: `Next question for ${role}` }
    ], { json: true, mini: true });
    return this.jp(r) || { question: `Tell me about your experience with ${domain}`, type: 'behavioral', difficulty: 'medium', expectedDuration: '2 min', evaluationCriteria: ['Clarity', 'Relevance'], followUpHint: 'Be specific with examples' };
  }

  // 5.3 Evaluate interview answer
  async evaluateAnswer(question, answer, role) {
    const r = await this.call([
      { role: 'system', content: `Evaluate interview answer for ${role}. Return ONLY JSON:
{"score":0,"maxScore":10,"contentStrength":"...","communicationClarity":"...","improvements":["..."],"betterAnswer":"...suggested improved answer...","followUps":["...questions interviewer might ask next..."]}` },
      { role: 'user', content: `Q: ${question}\nA: ${answer}` }
    ], { json: true, mini: true });
    return this.jp(r) || { score: 6, maxScore: 10, improvements: ['Add specific examples'], betterAnswer: '', followUps: [] };
  }

  // ═══════════════════════════════════════════════════════════
  // PART 6: RESEARCH PARTNER
  // ═══════════════════════════════════════════════════════════

  // 6.1 Paper Summary
  async summarizePaper(text) {
    const r = await this.call([
      { role: 'system', content: `Summarize research paper. Return ONLY JSON:
{"title":"...","threeLineSummary":"...","methodology":"...","keyFindings":["..."],"limitations":["..."],"futureWork":["..."],"relatedTopics":["..."],"criticalAnalysis":"...","citationSuggestion":"...APA format..."}` },
      { role: 'user', content: text.slice(0, 8000) }
    ], { json: true });
    return this.jp(r) || { title: 'Paper', threeLineSummary: 'Summary pending', keyFindings: [], limitations: [], futureWork: [] };
  }

  // 6.1 Literature Review Generator
  async generateLitReview(papers, topic) {
    return await this.call([
      { role: 'system', content: `Generate a structured literature review for "${topic}" from the provided paper summaries. Include: thematic grouping, chronological progression, gap identification, and synthesis. Use proper academic writing with in-text citations.` },
      { role: 'user', content: JSON.stringify(papers) }
    ]);
  }

  // 6.2 Research Methodology Advisor
  async suggestMethodology(researchQuestion) {
    const r = await this.call([
      { role: 'system', content: `Recommend research methodology. Return ONLY JSON:
{"approach":"qualitative|quantitative|mixed","justification":"...","methods":[{"name":"...","description":"...","pros":["..."],"cons":["..."]}],"statisticalTests":["..."],"sampleSize":{"recommended":0,"justification":"..."},"tools":["...software/tools..."],"ethicalConsiderations":["..."],"timeline":"...","hypotheses":[{"h":"...","testable":true,"novelty":"high|medium|low"}]}` },
      { role: 'user', content: researchQuestion }
    ], { json: true });
    return this.jp(r) || { approach: 'mixed', methods: [], hypotheses: [] };
  }

  // 6.3 Citation Generator
  async generateCitation(source, style = 'APA') {
    return await this.call([
      { role: 'system', content: `Generate a properly formatted ${style} citation for this source. Also provide MLA, Chicago, and Harvard versions.` },
      { role: 'user', content: source }
    ], { mini: true });
  }

  // ═══════════════════════════════════════════════════════════
  // PART 7: ANALYTICS
  // ═══════════════════════════════════════════════════════════

  // 7.1 Study Time Optimizer
  async optimizeStudyTime(sessionHistory) {
    const r = await this.call([
      { role: 'system', content: `Analyze study patterns and optimize. Return ONLY JSON:
{"bestTime":"morning|afternoon|evening|night","optimalSessionLength":25,"fatigueOnset":"...after X minutes...","productiveDays":["Monday","Wednesday"],"recommendations":["..."],"weeklySchedule":[{"day":"Mon","sessions":[{"time":"9:00 AM","subject":"...","duration":25}]}]}` },
      { role: 'user', content: JSON.stringify(sessionHistory) }
    ], { json: true, mini: true });
    return this.jp(r) || { bestTime: 'morning', optimalSessionLength: 25, recommendations: ['Study in 25-min blocks'] };
  }

  // 7.2 AI Teaching Assistant Report
  async generateClassReport(classData) {
    return await this.call([
      { role: 'system', content: 'Generate a weekly AI teaching assistant report from class data. Include: class progress summary, at-risk students, content gaps, top performers, recommended interventions, and next week priorities. Use clear, actionable language.' },
      { role: 'user', content: JSON.stringify(classData) }
    ]);
  }

  // ═══════════════════════════════════════════════════════════
  // PART 10: UNIQUE FEATURES
  // ═══════════════════════════════════════════════════════════

  // 10.1 AI Companion (proactive)
  async companionMessage(userData) {
    const r = await this.call([
      { role: 'system', content: `You are a proactive AI learning companion. Based on student data, generate ONE short personalized nudge (max 2 sentences). Be specific, not generic. Examples: "Physics exam in 3 days — Electromagnetism untouched. Quick recap?", "You mastered Arrays 40% faster than average — Linked Lists next?". Return ONLY JSON: {"message":"...","action":"start_quiz|review_topic|take_break|celebrate|study_plan","actionLabel":"...button text...","topic":"...relevant topic..."}` },
      { role: 'user', content: JSON.stringify(userData) }
    ], { json: true, mini: true });
    return this.jp(r) || { message: 'Ready to learn something new today?', action: 'start_quiz', actionLabel: 'Let\'s go!', topic: '' };
  }

  // 10.2 Dream Path Builder
  async buildDreamPath(career, currentSkills = [], currentLevel = 'beginner') {
    const r = await this.call([
      { role: 'system', content: `Reverse-engineer a complete learning path to achieve: "${career}". Return ONLY JSON:
{"careerGoal":"...","timeline":"...","currentGap":"...","phases":[{"phase":1,"title":"...","duration":"3 months","skills":["..."],"courses":["..."],"projects":["..."],"milestones":["..."],"resources":["..."]}],"certifications":["..."],"internships":["..."],"portfolioProjects":["..."],"expectedSalary":"...","keyAdvice":"...","alternativePaths":["..."]}` },
      { role: 'user', content: `Goal: ${career}\nCurrent skills: ${currentSkills.join(', ')}\nLevel: ${currentLevel}` }
    ], { json: true });
    return this.jp(r) || this._mockDreamPath(career);
  }

  // 10.3 AI Study Planner
  async generateStudyPlan(subjects, examDate, hoursPerDay, weakAreas = []) {
    const r = await this.call([
      { role: 'system', content: `Create optimal study plan with spaced repetition. Return ONLY JSON:
{"title":"...","totalDays":0,"dailyPlans":[{"day":1,"date":"...","sessions":[{"subject":"...","topic":"...","duration":60,"type":"learn|revise|practice|test","priority":"high|medium|low","spacedRepetition":false}],"totalMin":0}],"weeklyGoals":["..."],"spacedRepetition":[{"topic":"...","reviewDays":[1,3,7,14,30]}],"tips":["..."],"burnoutPrevention":"..."}
Respect energy patterns (hard subjects AM), interleave subjects, focus on weak areas, include breaks.` },
      { role: 'user', content: `Subjects: ${subjects.join(', ')}\nExam: ${examDate}\nHrs/day: ${hoursPerDay}\nWeak: ${weakAreas.join(', ')||'none'}` }
    ], { json: true });
    return this.jp(r) || this._mockPlan(subjects);
  }

  // 10.4 Concept Time Machine
  async conceptTimeline(topic) {
    const r = await this.call([
      { role: 'system', content: `Create a historical evolution timeline for "${topic}". Return ONLY JSON:
{"topic":"...","timeline":[{"year":0,"event":"...","significance":"...","keyPerson":"...","paradigmShift":false}],"currentUnderstanding":"...","futureDirections":"...","funFact":"..."}` },
      { role: 'user', content: `Timeline: ${topic}` }
    ], { json: true });
    return this.jp(r) || this._mockTimeline(topic);
  }

  // 10.5 AI Lab Partner
  async labSimulation(experiment, subject = 'Physics') {
    const r = await this.call([
      { role: 'system', content: `Simulate a ${subject} lab experiment. Return ONLY JSON:
{"experimentTitle":"...","objective":"...","apparatus":["..."],"procedure":["Step 1: ..."],"expectedObservations":["..."],"data":{"headers":["..."],"rows":[["..."]]},"calculations":"...","result":"...","conclusion":"...","precautions":["..."],"vivaQuestions":[{"q":"...","a":"..."}],"labReport":"...formatted report..."}` },
      { role: 'user', content: `Experiment: ${experiment}` }
    ], { json: true });
    return this.jp(r) || { experimentTitle: experiment, objective: '', apparatus: [], procedure: [], expectedObservations: [], result: '', conclusion: '' };
  }

  // 10.6 Parent Report
  async generateParentReport(studentData) {
    return await this.call([
      { role: 'system', content: 'Generate a weekly parent/guardian progress report in simple, non-technical, warm language. Include: overall progress, subject-wise highlights, areas needing attention, specific things parents can do to help, and an encouraging note. Keep it under 200 words. Use the student\'s name.' },
      { role: 'user', content: JSON.stringify(studentData) }
    ]);
  }

  // 10.7 Doubt Resolution
  async answerDoubt(question, subject = '', context = '') {
    return await this.call([
      { role: 'system', content: `Answer this student doubt${subject ? ' in ' + subject : ''}. Provide a clear, step-by-step explanation. Use examples and analogies. If math/science, show working. End with a "Quick Check" question to verify understanding.${context ? '\nStudent context: ' + context : ''}` },
      { role: 'user', content: question }
    ]);
  }

  // 10.9 Exam Stress Counselor
  async stressCounseling(message, examContext = '') {
    return await this.call([
      { role: 'system', content: `You are an empathetic AI exam stress counselor. You understand academic pressure deeply. Don't give generic "breathe deeply" advice. Instead: 1) Acknowledge their specific feelings 2) Provide personalized coping strategies based on their exam context 3) Give concrete time management advice 4) Build confidence with data-driven encouragement. Be warm, specific, and actionable.${examContext ? '\nExam context: ' + examContext : ''}` },
      { role: 'user', content: message }
    ]);
  }

  // ═══════════════════════════════════════════════════════════
  // MOCK RESPONSES (when API key not configured)
  // ═══════════════════════════════════════════════════════════

  _mock(msgs) {
    const m = msgs[msgs.length - 1]?.content || '';
    const responses = [
      `**Great question!** Let me break this down step by step.\n\nThe key concept here involves understanding the fundamental principles at work. Think of it like building blocks — each piece connects to the next.\n\n**Here's the breakdown:**\n1. First, identify the core problem\n2. Apply the relevant formula or method\n3. Check your work against known patterns\n\nWould you like me to go deeper? Or try a practice problem?\n\n💡 *Connect this to what you already know about related topics.*`,
      `I'd love to help you understand this better! 🎯\n\nLet me use an analogy: imagine you're building a recipe. Each ingredient (concept) needs to be added in the right order.\n\n**The main idea is:**\nEvery complex topic is made of simpler building blocks. Master those first, then see how they combine.\n\n**Try this:** Can you explain what you already know about this topic?\n\n*This connects to Bloom's "Apply" level — you're building real understanding!*`,
      `Excellent! This is a topic many students find tricky at first, but it clicks once you see the pattern. ✨\n\n**Here's how I'd approach it:**\n\nStart with basics → Build intuition → Apply to examples → Test edge cases\n\nThe key mistake most students make is jumping to memorization. Instead, focus on *why* each step works.\n\n**Quick Practice:**\nTry explaining this to an imaginary friend. If you can teach it, you've mastered it!\n\nShall I generate practice problems? 📝`
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  _mockDiagQ(sub, n) { return { question: `Q${n}: In ${sub}, which principle best describes...?`, type: 'mcq', options: ['A) Option 1', 'B) Option 2', 'C) Option 3 (correct)', 'D) Option 4'], correct: 2, bloomLevel: ['remember','understand','apply','analyze'][n%4], difficulty: 'medium', subTopic: sub, cognitiveSkill: 'textual', explanation: 'Correct because...', timeExpected: 30 }; }
  _mockProfile() { return { learningStyle: { primary: 'visual', secondary: 'textual', reasoning: 'concrete', processing: 'sequential', engagement: 'active' }, knowledgeBaseline: { overall: 'intermediate' }, bloomLevel: 'apply', pace: 'moderate', languageProficiency: 'advanced', optimalSessionLength: 25, bestStudyTime: 'morning', recommendedExplanationStyle: 'analogy-heavy', strengths: ['Conceptual understanding'], weaknesses: ['Advanced problem-solving'], personalizedTip: 'Use visual diagrams to reinforce learning' }; }
  _mockQuiz(t, c) { const qs = []; for (let i = 0; i < c; i++) qs.push({ id: i+1, q: `Q${i+1} about ${t}: What is the key principle?`, opts: ['A) First', 'B) Second', 'C) Third (correct)', 'D) Fourth'], ans: 2, exp: `C is correct because it addresses the core of ${t}.`, bloom: ['remember','understand','apply','analyze'][i%4], subTopic: t, difficulty: 'medium' }); return { questions: qs }; }
  _mockDoc(t) { return { title: t, summary: `Comprehensive overview of ${t} covering fundamentals through advanced topics.`, keyDefinitions: [{ term: 'Key Concept', definition: 'The fundamental principle...' }], chapterOutline: [{ title: 'Introduction', objectives: ['Understand basics'] }], flashcards: [{ front: 'What is the main concept?', back: 'The core principle that...' }], mcqs: [{ q: 'Core principle?', opts: ['A','B','C','D'], ans: 2, exp: 'C', bloom: 'understand' }], shortAnswerQs: [{ q: 'Explain the main idea', modelAns: '...', marks: 5 }], longAnswerQs: [{ q: 'Discuss in detail', outline: '...', marks: 10 }], conceptMap: { central: t, branches: [{ name: 'Basics', children: ['Def','History'] }] }, examTips: ['Focus on understanding, not memorization'], audioScript: 'Welcome to this lesson...', difficulty: 'intermediate' }; }
  _mockGrade() { return { score: 72, maxScore: 100, breakdown: { content: { score: 22, max: 30, feedback: 'Good coverage.' }, structure: { score: 18, max: 25, feedback: 'Needs transitions.' }, language: { score: 17, max: 25, feedback: 'Watch passive voice.' }, originality: { score: 15, max: 20, feedback: 'Push analysis further.' } }, keywordCoverage: ['main topic'], keywordsMissing: ['supporting evidence'], overallFeedback: 'Solid effort.', strengths: ['Clear thesis'], improvements: ['Add evidence'], modelAnswer: '...', plagiarismRisk: 'low', gradeEquivalent: 'B+' }; }
  _mockExam(sub) { return { title: `${sub} Exam`, subject: sub, totalMarks: 100, duration: '3 hours', sections: [{ name: 'Section A', marks: 20, questions: [{ q: 'Sample Q', opts: ['A','B','C','D'], ans: 0, marks: 1, bloom: 'remember' }] }] }; }
  _mockProblems(t, c) { const ps = []; for (let i = 0; i < c; i++) ps.push({ id: i+1, problem: `Problem ${i+1}: Solve for ${t}`, hints: ['Think about basics', 'Apply the formula', 'Check units'], solution: { steps: ['Step 1: Identify given', 'Step 2: Apply formula', 'Step 3: Calculate'], finalAnswer: 'Answer' }, difficulty: 'medium', estimatedTime: '5 min', commonMistakes: ['Sign errors'] }); return { problems: ps }; }
  _mockLesson(ch) { return { lessonTitle: ch, grade: '10', board: 'CBSE', duration: '45 min', objectives: ['Understand basics'], warmUp: { activity: 'Quick recall quiz', duration: '5 min' }, mainLesson: { beginner: '...', intermediate: '...', advanced: '...' }, exercises: [{ type: 'individual', activity: 'Practice problems', duration: '10 min' }], formativeAssessment: { questions: ['Q1'], rubric: '...' }, homework: 'Chapter exercises', teacherNotes: '...', differentiatedVersions: { advanced: '...', support: '...', ell: '...' }, bloomQuestions: { remember: ['Q'], understand: ['Q'], apply: ['Q'], analyze: ['Q'], evaluate: ['Q'], create: ['Q'] } }; }
  _mockPresentation(t, n) { const slides = []; for (let i = 0; i < n; i++) slides.push({ slideNum: i+1, title: i===0?t:`Point ${i}`, bulletPoints: ['Key point'], speakerNotes: 'Explain...', visualSuggestion: 'Chart/diagram', transitionTip: 'Connect to next' }); return { title: t, slides, overallTips: ['Practice timing'], estimatedDuration: `${n*2} minutes` }; }
  _mockDreamPath(c) { return { careerGoal: c, timeline: '2-3 years', currentGap: 'Need foundational skills', phases: [{ phase: 1, title: 'Foundation', duration: '3 months', skills: ['Core concepts'], courses: ['Intro course'], projects: ['Starter project'], milestones: ['Complete basics'], resources: ['Online courses'] }], certifications: ['Relevant cert'], internships: ['Industry internship'], portfolioProjects: ['Capstone project'], expectedSalary: 'Competitive', keyAdvice: 'Stay consistent', alternativePaths: ['Related career'] }; }
  _mockPlan(subjects) { const days = []; for (let i = 0; i < 7; i++) { const d = new Date(); d.setDate(d.getDate()+i); days.push({ day: i+1, date: d.toISOString().split('T')[0], sessions: subjects.map(s => ({ subject: s, topic: `${s} Ch.${i+1}`, duration: 60, type: ['learn','revise','practice','test'][i%4], priority: 'high', spacedRepetition: i%3===0 })), totalMin: subjects.length*60 }); } return { title: `Plan: ${subjects.join(' & ')}`, totalDays: 7, dailyPlans: days, weeklyGoals: ['Complete chapters','Take quizzes'], spacedRepetition: subjects.map(s => ({ topic: s, reviewDays: [1,3,7] })), tips: ['Hard subjects in morning','25-min Pomodoro blocks','Review before sleep'], burnoutPrevention: 'Take 5-min breaks every 25 min' }; }
  _mockTimeline(t) { return { topic: t, timeline: [{ year: 1900, event: 'Early discovery', significance: 'Foundation laid', keyPerson: 'Pioneer', paradigmShift: false },{ year: 1950, event: 'Major breakthrough', significance: 'Changed understanding', keyPerson: 'Researcher', paradigmShift: true },{ year: 2000, event: 'Modern era', significance: 'Current framework', keyPerson: 'Team', paradigmShift: false }], currentUnderstanding: 'Modern view...', futureDirections: 'Emerging research...', funFact: 'Interesting fact about ' + t }; }
}

window.aiEngine = new AIEngine();

// ══════════════════════════════════════════════════════════════════
// PLUMPEDIA FEATURES + ADMIN + E-LIBRARY + CERTIFICATES + FORUMS
// ══════════════════════════════════════════════════════════════════

// AI Content Studio — Book Generator
AIEngine.prototype.generateBook = async function(topic, chapters = 5, audience = 'college', lang = 'en') {
  const r = await this.call([
    { role: 'system', content: `Generate an educational ebook outline + first chapter content for "${topic}". Audience: ${audience}. Language: ${lang}. Return ONLY JSON:
{"title":"...","author":"AI Generated","audience":"${audience}","chapters":[{"num":1,"title":"...","summary":"...","content":"...full chapter text 300+ words...","keyTerms":["..."],"reviewQuestions":["..."]}],"preface":"...","totalEstimatedPages":0,"difficulty":"beginner|intermediate|advanced","tableOfContents":["Ch1: ..."],"bibliography":["..."]}
Generate ${chapters} chapters with full content for chapter 1 and summaries for the rest.` },
    { role: 'user', content: `Generate ebook: ${topic}` }
  ], { json: true });
  return this.jp(r) || { title: topic, chapters: [{ num: 1, title: 'Introduction', summary: 'Overview of ' + topic, content: 'Content would be generated here with a real API key.', keyTerms: ['Key concept'], reviewQuestions: ['What is the main idea?'] }], preface: 'Welcome to this AI-generated educational book.', tableOfContents: ['Ch1: Introduction'] };
};

// AI Content Studio — Podcast Script Generator
AIEngine.prototype.generatePodcast = async function(topic, duration = '10 min', style = 'educational', audience = 'college') {
  const r = await this.call([
    { role: 'system', content: `Generate a ${duration} educational podcast script about "${topic}" for ${audience} audience in ${style} style. Return ONLY JSON:
{"title":"...","duration":"${duration}","host":"AI Scholar","segments":[{"timestamp":"0:00","title":"...","script":"...full dialogue...","notes":"...production notes..."}],"intro":"...","outro":"...","keyTakeaways":["..."],"showNotes":"...","furtherReading":["..."]}` },
    { role: 'user', content: `Podcast: ${topic}` }
  ], { json: true });
  return this.jp(r) || { title: topic + ' Podcast', duration, segments: [{ timestamp: '0:00', title: 'Introduction', script: 'Welcome to today\'s episode...', notes: '' }], intro: 'Welcome!', keyTakeaways: ['Key point 1'] };
};

// AI Content Studio — Video Script Generator
AIEngine.prototype.generateVideoScript = async function(topic, duration = '5 min', audience = 'college') {
  const r = await this.call([
    { role: 'system', content: `Generate an educational video script about "${topic}" (~${duration}) for ${audience}. Return ONLY JSON:
{"title":"...","duration":"${duration}","scenes":[{"sceneNum":1,"timestamp":"0:00","duration":"30s","narration":"...","visualDescription":"...what appears on screen...","textOverlay":"...","animation":"...describe animation..."}],"thumbnail":"...description...","tags":["..."],"description":"...YouTube-style description..."}` },
    { role: 'user', content: `Video: ${topic}` }
  ], { json: true });
  return this.jp(r) || { title: topic, duration, scenes: [{ sceneNum: 1, timestamp: '0:00', duration: '30s', narration: 'In this video...', visualDescription: 'Title card', textOverlay: topic, animation: 'Fade in' }], tags: [topic], description: 'Educational video about ' + topic };
};

// AI Content Studio — Image Prompt Generator (for DALL-E)
AIEngine.prototype.generateImagePrompt = async function(topic, style = 'educational diagram') {
  const r = await this.call([
    { role: 'system', content: `Generate 4 DALL-E image prompts for educational visuals about "${topic}". Style: ${style}. Return ONLY JSON:
{"prompts":[{"description":"...detailed DALL-E prompt...","style":"${style}","purpose":"...what this teaches...","altText":"...accessibility text..."}]}` },
    { role: 'user', content: `Image prompts: ${topic}` }
  ], { json: true, mini: true });
  return this.jp(r) || { prompts: [{ description: `Educational ${style} showing ${topic}`, style, purpose: 'Visual learning aid', altText: topic + ' diagram' }] };
};

// Generate actual image via DALL-E
AIEngine.prototype.generateImage = async function(prompt) {
  if (!this.ok) return { url: '', error: 'Configure OpenAI API key in config.js to generate images' };
  try {
    const r = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.key}` },
      body: JSON.stringify({ model: 'dall-e-3', prompt, n: 1, size: '1024x1024', quality: 'standard' })
    });
    const d = await r.json();
    return { url: d.data?.[0]?.url || '', error: d.error?.message };
  } catch (e) { return { url: '', error: e.message }; }
};

// Certificate Generator
AIEngine.prototype.generateCertificate = async function(studentName, courseName, score, date) {
  return { studentName, courseName, score, date: date || new Date().toLocaleDateString(), certId: 'NXGS-' + Date.now().toString(36).toUpperCase(), issuer: 'NexGen Scholar AI', verified: true, achievements: score >= 90 ? 'With Distinction' : score >= 75 ? 'With Merit' : 'Completed' };
};

// Admin — Generate System Report
AIEngine.prototype.adminReport = async function(stats) {
  const r = await this.call([
    { role: 'system', content: `Generate a platform admin report from these stats. Include insights, trends, recommendations, and risk areas. Return ONLY JSON:
{"summary":"...","highlights":["..."],"concerns":["..."],"recommendations":["..."],"userGrowthTrend":"growing|stable|declining","engagementScore":0,"topContent":["..."],"actionItems":["..."]}` },
    { role: 'user', content: JSON.stringify(stats) }
  ], { json: true, mini: true });
  return this.jp(r) || { summary: 'Platform is operating normally.', highlights: ['Active users growing'], concerns: [], recommendations: ['Add more content'], engagementScore: 75 };
};

// Forum — AI Moderation
AIEngine.prototype.moderateContent = async function(text) {
  const r = await this.call([
    { role: 'system', content: 'Check if this educational forum post is appropriate. Return ONLY JSON: {"safe":true,"reason":"","category":"educational|off-topic|spam|inappropriate","qualityScore":0,"suggestedTags":["..."]}' },
    { role: 'user', content: text }
  ], { json: true, mini: true });
  return this.jp(r) || { safe: true, reason: '', category: 'educational', qualityScore: 70, suggestedTags: [] };
};
