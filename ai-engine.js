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
      { role: 'system', content: `You are in Academic Debate Mode. Take the OPPOSITE position to the student on "${topic}". Round ${round}/10. Present structured counter-arguments with evidence. Be intellectually rigorous but respectful. End with a pointed question that challenges their reasoning. After round 10, provide a debate summary with strengths/weaknesses of both sides.` },
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
    const m = (msgs[msgs.length - 1]?.content || '').toLowerCase();
    // Topic-aware responses
    if (m.includes('photosynthesis') || m.includes('plant') || m.includes('biology'))
      return `**Photosynthesis** is the process by which green plants convert light energy into chemical energy (glucose).\n\n**The equation:**\n6CO₂ + 6H₂O + Light Energy → C₆H₁₂O₆ + 6O₂\n\n**Key stages:**\n1. **Light-dependent reactions** — occur in the thylakoid membranes. Water is split (photolysis), producing O₂, ATP, and NADPH.\n2. **Calvin Cycle (light-independent)** — occurs in the stroma. CO₂ is fixed into glucose using ATP and NADPH.\n\n**Remember:** Chlorophyll absorbs red and blue light, reflects green — that's why leaves look green!\n\n**Common mistake:** Students confuse photosynthesis with respiration. Photosynthesis STORES energy; respiration RELEASES it.\n\nWant me to quiz you on this? 📝`;
    if (m.includes('newton') || m.includes('force') || m.includes('physics') || m.includes('motion'))
      return `**Newton's Laws of Motion:**\n\n**1st Law (Inertia):** An object at rest stays at rest, and an object in motion stays in motion at constant velocity, unless acted upon by an external force.\n→ Example: A book on a table won't move until you push it.\n\n**2nd Law (F = ma):** Force equals mass times acceleration. More force = more acceleration. More mass = less acceleration for the same force.\n→ Example: Pushing an empty cart vs. a loaded one.\n\n**3rd Law (Action-Reaction):** For every action, there is an equal and opposite reaction.\n→ Example: When you jump, your feet push Earth down, Earth pushes you up.\n\n**Key formula:** F = ma, where F is in Newtons (N), m in kg, a in m/s².\n\n**Common mistake:** The action and reaction forces act on DIFFERENT objects, not the same one!\n\nShall I generate practice problems? 🎯`;
    if (m.includes('python') || m.includes('code') || m.includes('programming') || m.includes('loop'))
      return `**Python Fundamentals:**\n\n**Variables:** Store data. No need to declare types.\n\`\`\`python\nname = "Alice"  # string\nage = 25        # integer\npi = 3.14       # float\n\`\`\`\n\n**Loops:**\n\`\`\`python\n# For loop\nfor i in range(5):\n    print(i)  # prints 0,1,2,3,4\n\n# While loop\ncount = 0\nwhile count < 5:\n    print(count)\n    count += 1\n\`\`\`\n\n**Functions:**\n\`\`\`python\ndef greet(name):\n    return f"Hello, {name}!"\n\nprint(greet("Scholar"))  # Hello, Scholar!\n\`\`\`\n\n**Key tip:** Python uses indentation (4 spaces) instead of curly braces. Indentation errors are the #1 beginner mistake!\n\nWant to try a coding challenge? 🎯`;
    if (m.includes('math') || m.includes('calcul') || m.includes('equation') || m.includes('algebra'))
      return `**Let me help with the math!**\n\n**Quadratic Formula:** For ax² + bx + c = 0:\nx = (-b ± √(b² - 4ac)) / 2a\n\n**Example:** Solve 2x² + 5x - 3 = 0\n- a = 2, b = 5, c = -3\n- Discriminant: b² - 4ac = 25 + 24 = 49\n- x = (-5 ± 7) / 4\n- x₁ = 2/4 = 0.5\n- x₂ = -12/4 = -3\n\n**Verification:** Plug x = 0.5 back in: 2(0.25) + 5(0.5) - 3 = 0.5 + 2.5 - 3 = 0 ✓\n\n**Key concepts to remember:**\n- Discriminant > 0: Two real roots\n- Discriminant = 0: One repeated root\n- Discriminant < 0: No real roots (complex roots)\n\n**Common mistake:** Forgetting the ± gives you only one root instead of two!\n\nWant practice problems on this? 📝`;
    if (m.includes('chemistry') || m.includes('periodic') || m.includes('element') || m.includes('atom'))
      return `**The Periodic Table & Atomic Structure:**\n\n**Atom structure:**\n- **Protons** (positive, in nucleus) — define the element\n- **Neutrons** (neutral, in nucleus) — define the isotope\n- **Electrons** (negative, in shells) — define chemical behavior\n\n**Atomic number** = number of protons\n**Mass number** = protons + neutrons\n\n**Periodic Table Trends:**\n- **Electronegativity:** Increases → and ↑ (Fluorine is most electronegative)\n- **Atomic radius:** Increases ← and ↓\n- **Ionization energy:** Increases → and ↑\n- **Metallic character:** Increases ← and ↓\n\n**Memory aid:** "Effective Nuclear Charge Increases Right" — this explains most trends!\n\n**Fun fact:** Dmitri Mendeleev predicted gallium, germanium, and scandium before they were discovered, just by leaving gaps in his table!\n\nWant to test your knowledge? 📝`;
    // Generic but still educational
    const responses = [
      `**Great question!** Let me break this down clearly.\n\n**Core concept:** Every complex topic is built from simpler building blocks. The key is understanding HOW they connect, not just WHAT they are.\n\n**Step-by-step approach:**\n1. **Identify** the fundamental principle at work\n2. **Connect** it to concepts you already know\n3. **Apply** it to a simple example first\n4. **Extend** to more complex scenarios\n5. **Test** your understanding with practice\n\n**Analogy:** Think of learning like building with LEGO — you can't build the roof before the walls, and you can't build walls without a foundation.\n\n**Pro tip:** The best way to know if you truly understand something is to try explaining it to someone else. If you can teach it, you own it!\n\nWant me to go deeper on any specific part? Or shall I quiz you? 📝`,
      `**Here's a thorough explanation:**\n\n**The fundamentals:**\nEvery subject has 3-5 core principles that everything else builds on. Master those, and the rest follows naturally.\n\n**How to approach this:**\n1. Start with the **definition** — what IS this thing?\n2. Understand the **WHY** — why does it work this way?\n3. See **examples** — how does it look in practice?\n4. Find the **exceptions** — where does it break down?\n5. Make **connections** — how does it relate to other topics?\n\n**Common student mistakes:**\n- Memorizing without understanding\n- Skipping fundamentals to reach advanced topics\n- Not practicing enough with varied examples\n\n**Study strategy:** After learning a concept, close your notes and write down everything you remember. The gaps in your recall show exactly what needs more work — this is called "active recall" and it's the most effective study technique proven by research.\n\nShall I create practice problems or a quick quiz? 🎯`,
      `**Let me explain this using a real-world analogy:**\n\nImagine you're learning to cook a new dish. You need to:\n1. **Know the ingredients** (basic concepts)\n2. **Understand the technique** (how concepts interact)\n3. **Practice the recipe** (apply to problems)\n4. **Experiment with variations** (handle edge cases)\n\n**The same applies to this topic:**\n- First, get clear on the key terms and definitions\n- Then, understand the relationships between them\n- Next, work through examples step by step\n- Finally, try problems without looking at solutions\n\n**Memory technique:** Create a "concept map" — write the main idea in the center, then branch out to related concepts. This visual representation helps your brain create stronger connections.\n\n**Research shows:** Students who test themselves regularly remember 50% more than those who just re-read notes. So let's practice!\n\nWant me to generate a quiz, or explain a specific part in more detail? 📝`
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  _mockDiagQ(sub, n) {
    const banks = {
      'Mathematics': [
        { question: 'What is the derivative of sin(x)?', options: ['A) cos(x)', 'B) -cos(x)', 'C) tan(x)', 'D) -sin(x)'], correct: 0, explanation: 'The derivative of sin(x) is cos(x). This is a fundamental differentiation rule.', subTopic: 'Calculus', difficulty: 'medium' },
        { question: 'If f(x) = x² + 3x + 2, what are the roots?', options: ['A) x = -1, -2', 'B) x = 1, 2', 'C) x = -1, 2', 'D) x = 1, -2'], correct: 0, explanation: 'Factoring: (x+1)(x+2) = 0, so x = -1 or x = -2.', subTopic: 'Algebra', difficulty: 'easy' },
        { question: 'What is the value of log₁₀(1000)?', options: ['A) 2', 'B) 3', 'C) 4', 'D) 10'], correct: 1, explanation: '10³ = 1000, so log₁₀(1000) = 3.', subTopic: 'Logarithms', difficulty: 'easy' },
        { question: 'The integral of 1/x dx equals:', options: ['A) x²/2 + C', 'B) ln|x| + C', 'C) 1/x² + C', 'D) e^x + C'], correct: 1, explanation: 'The integral of 1/x is the natural logarithm ln|x| + C.', subTopic: 'Integration', difficulty: 'medium' },
        { question: 'In a right triangle, if the hypotenuse is 13 and one side is 5, the other side is:', options: ['A) 8', 'B) 10', 'C) 12', 'D) 11'], correct: 2, explanation: 'By Pythagoras: √(13² - 5²) = √(169 - 25) = √144 = 12.', subTopic: 'Geometry', difficulty: 'easy' }
      ],
      'Science': [
        { question: 'Which organelle is known as the powerhouse of the cell?', options: ['A) Nucleus', 'B) Ribosome', 'C) Mitochondria', 'D) Golgi apparatus'], correct: 2, explanation: 'Mitochondria produce ATP through cellular respiration, providing energy for the cell.', subTopic: 'Cell Biology', difficulty: 'easy' },
        { question: 'What is the SI unit of electric current?', options: ['A) Volt', 'B) Watt', 'C) Ampere', 'D) Ohm'], correct: 2, explanation: 'The Ampere (A) measures electric current — the rate of flow of electric charge.', subTopic: 'Physics', difficulty: 'easy' },
        { question: 'Which gas makes up approximately 78% of Earth\'s atmosphere?', options: ['A) Oxygen', 'B) Carbon dioxide', 'C) Nitrogen', 'D) Argon'], correct: 2, explanation: 'Nitrogen (N₂) makes up about 78% of the atmosphere, oxygen is about 21%.', subTopic: 'Environmental Science', difficulty: 'easy' },
        { question: 'What happens to the resistance of a conductor when temperature increases?', options: ['A) Decreases', 'B) Remains same', 'C) Increases', 'D) Becomes zero'], correct: 2, explanation: 'In conductors, increased temperature causes more lattice vibrations, increasing resistance.', subTopic: 'Physics', difficulty: 'medium' },
        { question: 'The pH of a neutral solution at 25°C is:', options: ['A) 0', 'B) 7', 'C) 14', 'D) 1'], correct: 1, explanation: 'At 25°C, pure water has equal H⁺ and OH⁻ concentrations, giving pH = 7.', subTopic: 'Chemistry', difficulty: 'easy' }
      ],
      'default': [
        { question: 'Which data structure uses FIFO (First In, First Out) ordering?', options: ['A) Stack', 'B) Queue', 'C) Tree', 'D) Graph'], correct: 1, explanation: 'A Queue follows FIFO — the first element added is the first one removed, like a line at a store.', subTopic: 'Data Structures', difficulty: 'easy' },
        { question: 'What does HTML stand for?', options: ['A) Hyper Text Markup Language', 'B) High Tech Modern Language', 'C) Hyper Transfer Markup Language', 'D) Home Tool Markup Language'], correct: 0, explanation: 'HTML = HyperText Markup Language, the standard language for creating web pages.', subTopic: 'Web Development', difficulty: 'easy' },
        { question: 'Which of the following is NOT a programming paradigm?', options: ['A) Object-Oriented', 'B) Functional', 'C) Procedural', 'D) Mechanical'], correct: 3, explanation: 'Mechanical is not a programming paradigm. The main paradigms are OOP, Functional, Procedural, and Declarative.', subTopic: 'Programming', difficulty: 'easy' },
        { question: 'What is the time complexity of binary search?', options: ['A) O(n)', 'B) O(n²)', 'C) O(log n)', 'D) O(1)'], correct: 2, explanation: 'Binary search halves the search space each step, giving O(log n) time complexity.', subTopic: 'Algorithms', difficulty: 'medium' },
        { question: 'Which sorting algorithm has the best average-case time complexity?', options: ['A) Bubble Sort — O(n²)', 'B) Merge Sort — O(n log n)', 'C) Selection Sort — O(n²)', 'D) Insertion Sort — O(n²)'], correct: 1, explanation: 'Merge Sort consistently achieves O(n log n) in all cases (best, average, worst).', subTopic: 'Algorithms', difficulty: 'medium' }
      ]
    };
    const bank = banks[sub] || banks['default'];
    const q = bank[n % bank.length];
    return { question: q.question, type: 'mcq', options: q.options, correct: q.correct, bloomLevel: ['remember','understand','apply','analyze'][n%4], difficulty: q.difficulty, subTopic: q.subTopic, cognitiveSkill: 'textual', explanation: q.explanation, timeExpected: 30 };
  }

  _mockProfile() { return { learningStyle: { primary: 'visual', secondary: 'textual', reasoning: 'concrete', processing: 'sequential', engagement: 'active' }, knowledgeBaseline: { overall: 'intermediate' }, bloomLevel: 'apply', pace: 'moderate', languageProficiency: 'advanced', optimalSessionLength: 25, bestStudyTime: 'morning', recommendedExplanationStyle: 'analogy-heavy', strengths: ['Conceptual understanding', 'Problem identification'], weaknesses: ['Multi-step problem solving', 'Time management under pressure'], personalizedTip: 'You learn best with visual diagrams and real-world analogies. Try drawing concept maps after each study session.' }; }

  _mockQuiz(t, c) {
    const topicBanks = {
      'photosynthesis': [
        { q: 'Where do the light-dependent reactions of photosynthesis take place?', opts: ['A) Stroma', 'B) Thylakoid membranes', 'C) Cell wall', 'D) Cytoplasm'], ans: 1, exp: 'Light-dependent reactions occur in the thylakoid membranes where chlorophyll absorbs light energy.', bloom: 'remember' },
        { q: 'What is the primary pigment involved in photosynthesis?', opts: ['A) Carotenoid', 'B) Xanthophyll', 'C) Chlorophyll a', 'D) Anthocyanin'], ans: 2, exp: 'Chlorophyll a is the primary photosynthetic pigment that directly participates in light reactions.', bloom: 'remember' },
        { q: 'During photosynthesis, water molecules are split in a process called:', opts: ['A) Hydrolysis', 'B) Photolysis', 'C) Glycolysis', 'D) Electrolysis'], ans: 1, exp: 'Photolysis (photo = light, lysis = splitting) is the light-driven splitting of water molecules.', bloom: 'understand' },
        { q: 'Which molecule is the final electron acceptor in the light reactions?', opts: ['A) O₂', 'B) CO₂', 'C) NADP⁺', 'D) ATP'], ans: 2, exp: 'NADP⁺ accepts electrons and H⁺ to become NADPH, which is used in the Calvin cycle.', bloom: 'understand' },
        { q: 'If a plant is placed in an environment with no CO₂, which process would stop first?', opts: ['A) Light reactions', 'B) Calvin cycle', 'C) Water absorption', 'D) Transpiration'], ans: 1, exp: 'The Calvin cycle requires CO₂ for carbon fixation. Without CO₂, it stops, then light reactions slow as NADPH accumulates.', bloom: 'analyze' }
      ],
      'newton': [
        { q: 'A 10 kg object accelerates at 2 m/s². What net force is acting on it?', opts: ['A) 5 N', 'B) 12 N', 'C) 20 N', 'D) 0.2 N'], ans: 2, exp: 'Using F = ma: F = 10 kg × 2 m/s² = 20 N.', bloom: 'apply' },
        { q: 'Which of Newton\'s laws explains why you feel pushed back when a car accelerates?', opts: ['A) First Law (Inertia)', 'B) Second Law (F=ma)', 'C) Third Law (Action-Reaction)', 'D) Law of Gravitation'], ans: 0, exp: 'Your body tends to stay at rest (inertia) while the car moves forward, making you feel pushed back.', bloom: 'understand' },
        { q: 'A book rests on a table. The normal force and the weight of the book are:', opts: ['A) An action-reaction pair', 'B) Equal and opposite but NOT an action-reaction pair', 'C) Unequal forces', 'D) In the same direction'], ans: 1, exp: 'They are equal and opposite (equilibrium), but NOT an action-reaction pair. The reaction to the book\'s weight is the book pulling Earth upward.', bloom: 'analyze' },
        { q: 'If you double the mass and halve the force on an object, the acceleration becomes:', opts: ['A) 4 times less', 'B) 2 times less', 'C) Same', 'D) 2 times more'], ans: 0, exp: 'a = F/m. If F becomes F/2 and m becomes 2m: a_new = (F/2)/(2m) = F/4m = a/4.', bloom: 'apply' },
        { q: 'An astronaut floating in space throws a ball. What happens to the astronaut?', opts: ['A) Nothing happens', 'B) Moves in the same direction as the ball', 'C) Moves in the opposite direction of the ball', 'D) Starts spinning'], ans: 2, exp: 'Newton\'s 3rd Law: throwing the ball forward pushes the astronaut backward with equal force.', bloom: 'apply' }
      ],
      'default': [
        { q: `In the context of ${t}, which statement best describes the fundamental principle?`, opts: [`A) It relies on sequential processing of information`, `B) It involves hierarchical organization of concepts`, `C) It requires both theoretical knowledge and practical application`, `D) It only applies in controlled laboratory conditions`], ans: 2, exp: `Most academic subjects require both theoretical understanding and practical application to achieve mastery.`, bloom: 'understand' },
        { q: `Which approach is most effective for learning ${t}?`, opts: [`A) Memorizing all formulas and definitions`, `B) Understanding core concepts then practicing with varied examples`, `C) Reading the textbook once thoroughly`, `D) Only solving previous year exam papers`], ans: 1, exp: `Research shows that understanding fundamentals and then practicing with diverse problems leads to the deepest learning and best retention.`, bloom: 'evaluate' },
        { q: `A student studying ${t} gets a different result than expected. The best next step is:`, opts: [`A) Assume the textbook answer is wrong`, `B) Re-check each step of the working carefully`, `C) Skip the problem and move on`, `D) Ask someone for the answer`], ans: 1, exp: `Systematic error-checking builds problem-solving skills. Most unexpected results come from calculation or conceptual errors in intermediate steps.`, bloom: 'analyze' },
        { q: `Which of these is a higher-order thinking skill according to Bloom's Taxonomy when applied to ${t}?`, opts: [`A) Recalling definitions`, `B) Listing examples`, `C) Evaluating different approaches to solve a problem`, `D) Identifying key terms`], ans: 2, exp: `Evaluation (comparing and judging approaches) is a higher-order skill on Bloom's Taxonomy, above remembering and understanding.`, bloom: 'evaluate' },
        { q: `What is the best way to verify your understanding of a concept in ${t}?`, opts: [`A) Highlight the textbook`, `B) Re-read your notes`, `C) Try to explain it without looking at any materials`, `D) Copy the notes again`], ans: 2, exp: `Active recall (explaining from memory) is proven to be far more effective than passive re-reading. If you can explain it without notes, you truly understand it.`, bloom: 'evaluate' }
      ]
    };
    const tl = t.toLowerCase();
    let bank = topicBanks.default;
    if (tl.includes('photosynth') || tl.includes('plant') || tl.includes('biology')) bank = topicBanks.photosynthesis;
    else if (tl.includes('newton') || tl.includes('force') || tl.includes('motion') || tl.includes('physics')) bank = topicBanks.newton;
    const qs = [];
    for (let i = 0; i < c; i++) {
      const q = bank[i % bank.length];
      qs.push({ id: i+1, q: q.q, opts: q.opts, ans: q.ans, exp: q.exp, bloom: q.bloom, subTopic: t, difficulty: 'medium' });
    }
    return { questions: qs };
  }

  _mockDoc(t) { return { title: t, summary: `This document provides a comprehensive study of ${t}. It covers the historical development, core theoretical framework, key formulas and principles, practical applications, and current research directions. Students will gain both conceptual understanding and problem-solving skills.`, keyDefinitions: [{ term: 'Core Principle', definition: `The foundational concept in ${t} that all other ideas build upon. Understanding this is essential before moving to advanced topics.` }, { term: 'Application Domain', definition: `The real-world context where ${t} concepts are applied, including engineering, medicine, technology, and research.` }, { term: 'Analytical Framework', definition: 'A systematic approach to breaking down complex problems into manageable steps using established methods.' }], chapterOutline: [{ title: 'Chapter 1: Historical Foundation & Context', objectives: ['Understand the evolution of key ideas', 'Identify major contributors'] }, { title: 'Chapter 2: Core Concepts & Principles', objectives: ['Master fundamental definitions', 'Understand relationships between concepts'] }, { title: 'Chapter 3: Mathematical Framework', objectives: ['Apply key formulas', 'Solve standard problems'] }, { title: 'Chapter 4: Advanced Applications', objectives: ['Analyze complex scenarios', 'Connect theory to practice'] }], flashcards: [{ front: `What is the core principle of ${t}?`, back: `It is the fundamental concept that describes how the key elements interact and relate to each other within the system.` }, { front: 'Why is this topic important?', back: `${t} has applications in multiple fields including technology, research, healthcare, and engineering. It forms the foundation for many advanced concepts.` }, { front: 'What is the most common mistake students make?', back: 'Trying to memorize without understanding. Focus on WHY things work, not just WHAT the answer is.' }], mcqs: [{ q: `Which of the following best describes the scope of ${t}?`, opts: ['A) Limited to theoretical study only', 'B) Both theoretical understanding and practical application', 'C) Only useful in laboratory settings', 'D) Outdated and no longer relevant'], ans: 1, exp: `${t} encompasses both theory and practice, with wide-ranging modern applications.`, bloom: 'understand' }], shortAnswerQs: [{ q: `Explain the main principle of ${t} in your own words (5 marks)`, modelAns: `A strong answer should: define the core concept, explain how it works with an example, mention its significance, and connect it to related topics.`, marks: 5 }], longAnswerQs: [{ q: `Discuss the evolution and modern applications of ${t} (10 marks)`, outline: 'Introduction → Historical background → Key breakthroughs → Modern applications → Future directions → Conclusion', marks: 10 }], conceptMap: { central: t, branches: [{ name: 'Fundamentals', children: ['Key Definitions', 'Core Principles', 'Historical Context'] }, { name: 'Applications', children: ['Real-world Uses', 'Problem Solving', 'Case Studies'] }, { name: 'Advanced Topics', children: ['Current Research', 'Open Problems', 'Interdisciplinary Connections'] }] }, examTips: ['Focus on understanding core principles — they appear in 60% of exam questions', 'Practice numerical problems daily — speed matters in timed exams', 'Draw diagrams wherever possible — they earn extra marks', 'Review past papers to identify frequently tested topics', 'Use the SQ3R method: Survey, Question, Read, Recite, Review'], audioScript: `Welcome to your AI-generated lesson on ${t}. Today we will explore the fundamental concepts, work through key examples, and prepare you for exam-level questions. Let us begin with the basics...`, difficulty: 'intermediate' }; }

  _mockGrade() { return { score: 72, maxScore: 100, breakdown: { content: { score: 22, max: 30, feedback: 'Good coverage of main arguments with relevant examples. However, the second paragraph could use a stronger supporting citation. The conclusion needs to tie back to your thesis more explicitly.' }, structure: { score: 18, max: 25, feedback: 'Clear introduction with a stated thesis. Body paragraphs follow a logical sequence. However, transitions between paragraphs 2 and 3 are abrupt — use connecting phrases like "Furthermore" or "Building on this".' }, language: { score: 17, max: 25, feedback: 'Generally well-written with appropriate academic tone. Watch for passive voice overuse (found in 40% of sentences). Vary sentence length — mix short impactful statements with longer explanatory ones.' }, originality: { score: 15, max: 20, feedback: 'Shows independent thinking in the analysis section. Could push further by challenging the commonly accepted view and presenting your own interpretation backed by evidence.' } }, keywordCoverage: ['thesis', 'analysis', 'methodology'], keywordsMissing: ['counter-argument', 'empirical evidence', 'limitations'], overallFeedback: 'A solid B+ effort. Your thesis is clear and your examples are relevant. To push to an A, add counter-arguments, include more specific evidence with citations, and strengthen your conclusion.', strengths: ['Clear thesis statement', 'Logical paragraph structure', 'Good use of topic-relevant examples'], improvements: ['Add counter-arguments to strengthen analysis', 'Include specific data/citations as evidence', 'Strengthen transitions between paragraphs', 'Vary sentence structure to improve readability'], modelAnswer: 'An ideal answer would open with a compelling hook, state a precise thesis, present 3-4 evidence-backed arguments with counter-arguments addressed, and conclude by synthesizing the key insight rather than just restating the thesis.', plagiarismRisk: 'low', gradeEquivalent: 'B+' }; }

  _mockExam(sub) { return { title: `${sub} — Final Examination`, subject: sub, totalMarks: 100, duration: '3 hours', sections: [{ name: 'Section A — Multiple Choice (20 marks)', marks: 20, questions: [{ q: `Which fundamental concept in ${sub} explains how systems maintain equilibrium?`, opts: ['A) Positive feedback', 'B) Homeostasis / Dynamic equilibrium', 'C) Entropy maximization', 'D) Linear progression'], ans: 1, marks: 2, bloom: 'remember' }, { q: `When analyzing a problem in ${sub}, the first step should be:`, opts: ['A) Apply the most complex formula', 'B) Identify given information and what is being asked', 'C) Look at the answer choices', 'D) Draw a random diagram'], ans: 1, marks: 2, bloom: 'understand' }] }, { name: 'Section B — Short Answer (30 marks)', marks: 30, questions: [{ q: `Define three key terms in ${sub} and explain their interrelationship. (6 marks)`, modelAns: 'Define each term precisely, then explain how they connect using examples.', marks: 6, bloom: 'understand' }, { q: `Solve the following problem step by step, showing all working. (8 marks)`, modelAns: 'Full step-by-step solution with units and verification.', marks: 8, bloom: 'apply' }] }, { name: 'Section C — Long Answer (50 marks)', marks: 50, questions: [{ q: `Discuss the historical development and modern applications of a major concept in ${sub}. Support with specific examples. (15 marks)`, outline: 'Intro → Historical context → Key discoveries → Modern applications → Future directions → Conclusion', marks: 15, bloom: 'evaluate' }, { q: `Compare and contrast two major approaches/theories in ${sub}. Which is more applicable in real-world scenarios? Justify your answer. (15 marks)`, outline: 'Define both → Compare similarities → Contrast differences → Real-world analysis → Justified conclusion', marks: 15, bloom: 'evaluate' }] }], markingScheme: 'Marks allocated for: correct content (40%), clear explanation (30%), relevant examples (20%), presentation (10%)', difficultyDistribution: { easy: 30, medium: 50, hard: 20 }, bloomDistribution: { remember: 15, understand: 25, apply: 25, analyze: 20, evaluate: 10, create: 5 } }; }

  _mockProblems(t, c) { const templates = [
    { problem: `A student is studying ${t} and encounters a system with initial value of 50 units. After applying the standard transformation, the value increases by 30%. Calculate the final value and the absolute change.`, hints: ['Start by calculating 30% of 50', 'Percentage increase: value × (percentage/100)', 'Final value = initial + increase'], solution: { steps: ['Step 1: Calculate the increase: 50 × 0.30 = 15', 'Step 2: Calculate final value: 50 + 15 = 65', 'Step 3: Absolute change = 65 - 50 = 15 units'], finalAnswer: 'Final value = 65 units, Absolute change = 15 units' }, commonMistakes: ['Confusing percentage increase with percentage of the new value', 'Forgetting to add the increase to the original value'] },
    { problem: `In ${t}, you are given a dataset of 5 values: 12, 18, 24, 15, 21. Calculate the mean, median, and range.`, hints: ['Mean = sum of all values ÷ count', 'Median = middle value when sorted', 'Range = highest - lowest'], solution: { steps: ['Step 1: Sort the data: 12, 15, 18, 21, 24', 'Step 2: Mean = (12+15+18+21+24)/5 = 90/5 = 18', 'Step 3: Median (middle value) = 18', 'Step 4: Range = 24 - 12 = 12'], finalAnswer: 'Mean = 18, Median = 18, Range = 12' }, commonMistakes: ['Forgetting to sort before finding median', 'Dividing by wrong count for mean'] },
    { problem: `A process related to ${t} follows the pattern: 2, 6, 18, 54, ___. Find the next three terms and the general formula.`, hints: ['Look at the ratio between consecutive terms', 'Each term = previous term × common ratio', 'General formula: aₙ = a₁ × r^(n-1)'], solution: { steps: ['Step 1: Find common ratio: 6/2 = 3, 18/6 = 3, 54/18 = 3', 'Step 2: This is a geometric sequence with r = 3', 'Step 3: Next terms: 54×3 = 162, 162×3 = 486, 486×3 = 1458', 'Step 4: General formula: aₙ = 2 × 3^(n-1)'], finalAnswer: 'Next three terms: 162, 486, 1458. Formula: aₙ = 2 × 3^(n-1)' }, commonMistakes: ['Confusing arithmetic sequence (constant difference) with geometric (constant ratio)', 'Off-by-one error in the exponent of the general formula'] },
    { problem: `An experiment in ${t} measures a quantity over time: At t=0s, value=10; at t=2s, value=30; at t=4s, value=50. Determine if the relationship is linear, and find the rate of change.`, hints: ['Check if the change is constant over equal time intervals', 'Rate of change = Δvalue / Δtime', 'If rate is constant, the relationship is linear'], solution: { steps: ['Step 1: Change from t=0 to t=2: 30-10 = 20 over 2s', 'Step 2: Change from t=2 to t=4: 50-30 = 20 over 2s', 'Step 3: Rate of change = 20/2 = 10 units/second (constant)', 'Step 4: Since rate is constant, the relationship IS linear', 'Step 5: Equation: value = 10 + 10t'], finalAnswer: 'Linear relationship. Rate of change = 10 units/second. Equation: y = 10 + 10t' }, commonMistakes: ['Not checking if the rate is constant at all intervals', 'Forgetting the initial value (y-intercept) in the equation'] },
    { problem: `In a ${t} context, compare two methods: Method A takes 3 hours and costs ₹500 with 95% accuracy. Method B takes 1 hour and costs ₹200 with 80% accuracy. Which method would you recommend for: (a) a critical application, (b) a quick prototype?`, hints: ['Consider the trade-offs: time, cost, and accuracy', 'Critical applications prioritize accuracy', 'Prototypes prioritize speed and cost'], solution: { steps: ['Step 1: List trade-offs — A: slower, costlier, more accurate; B: faster, cheaper, less accurate', 'Step 2: For critical applications: accuracy is paramount → Method A (95% accuracy)', 'Step 3: For quick prototype: speed and cost matter more → Method B (1hr, ₹200)', 'Step 4: Consider: Could you use B first for prototyping, then A for final version?'], finalAnswer: '(a) Method A for critical applications (95% accuracy). (b) Method B for prototypes (faster, cheaper). Best strategy: Use B for iteration, A for final deployment.' }, commonMistakes: ['Only considering one factor (cost) while ignoring accuracy', 'Not considering a combined approach'] }
  ];
  const ps = [];
  for (let i = 0; i < c; i++) { const tmpl = templates[i % templates.length]; ps.push({ id: i+1, problem: tmpl.problem, hints: tmpl.hints, solution: tmpl.solution, difficulty: 'medium', estimatedTime: '5-8 min', commonMistakes: tmpl.commonMistakes }); }
  return { problems: ps }; }

  _mockLesson(ch) { return { lessonTitle: ch, grade: '10', board: 'CBSE', duration: '45 min', objectives: ['Understand the fundamental concepts and terminology', 'Apply principles to solve standard problems', 'Analyze real-world applications', 'Evaluate different approaches to problem-solving'], warmUp: { activity: '5-minute quick recall quiz: Students write down 3 things they remember from the previous lesson. Share with a partner and discuss gaps.', duration: '5 min' }, mainLesson: { beginner: `Start with everyday examples students can relate to. Use visual aids and diagrams. Focus on "what" and "why" before "how". Break complex ideas into small, digestible pieces. Use think-pair-share for engagement.`, intermediate: `Build on prior knowledge with more complex examples. Introduce formal terminology and notation. Include guided practice with increasing difficulty. Use worked examples followed by independent practice.`, advanced: `Present challenging applications and edge cases. Encourage students to derive formulas rather than memorize. Include open-ended problems with multiple solution paths. Connect to university-level concepts.` }, exercises: [{ type: 'individual', activity: 'Solve 5 graded practice problems (2 easy, 2 medium, 1 hard). Self-check with provided answer key.', duration: '10 min' }, { type: 'pair', activity: 'Exchange solutions with a partner. Check each other\'s working and discuss any differences in approach.', duration: '5 min' }, { type: 'group', activity: 'Groups of 4 solve a real-world application problem. Present solution to class.', duration: '10 min' }], formativeAssessment: { questions: ['Define the key concept in your own words', 'Solve this problem and explain each step', 'Give a real-world example of this concept', 'What would happen if we changed this variable?'], rubric: 'Marks for: accuracy (40%), explanation quality (30%), real-world connection (20%), presentation (10%)' }, homework: 'Complete exercises 1-10 from textbook Chapter section. Write a 100-word reflection on how this topic connects to everyday life.', teacherNotes: 'Common misconception: Students often confuse [concept A] with [concept B]. Address this early with a clear comparison table. Watch for students who can solve mechanically but cannot explain WHY.', differentiatedVersions: { advanced: 'Extension: Research and present a real-world case study where this concept is applied in industry or research.', support: 'Scaffolded version: Provide partially completed solutions where students fill in the missing steps. Include a concept glossary with visuals.', ell: 'Bilingual glossary provided. Key terms explained with simple language and visual aids. Partner with fluent English speaker for discussion activities.' }, bloomQuestions: { remember: ['Define the key terminology', 'List the main steps of the process'], understand: ['Explain why this principle works', 'Describe the relationship between X and Y'], apply: ['Calculate the result given these values', 'Use the formula to solve this new problem'], analyze: ['Compare these two approaches — which is more efficient and why?', 'What would happen if we removed one condition?'], evaluate: ['Is this solution correct? Justify your answer', 'Which method would you recommend and why?'], create: ['Design your own problem that tests this concept', 'Propose a real-world application that uses this principle'] }, resources: ['Textbook Chapter', 'Video demonstration', 'Interactive simulation', 'Practice worksheet'] }; }

  _mockPresentation(t, n) { const slideTemplates = [
    { title: t, bulletPoints: ['Overview & learning objectives', 'What you will learn today', 'Why this topic matters'], speakerNotes: 'Welcome the audience. State the topic and 3 key takeaways they will gain by the end.', visualSuggestion: 'Title slide with bold typography and a relevant background image', transitionTip: 'Start with a thought-provoking question or surprising statistic' },
    { title: 'Why This Matters', bulletPoints: ['Real-world relevance and applications', 'Current industry demand for this knowledge', 'How this connects to your career goals'], speakerNotes: 'Hook the audience by showing WHY they should care. Use a compelling statistic or story.', visualSuggestion: 'Large statistic callout (60pt font) with supporting image', transitionTip: 'Bridge from "why it matters" to "what it actually is"' },
    { title: 'Core Concepts', bulletPoints: ['Fundamental principle #1 with clear definition', 'Fundamental principle #2 with example', 'How these principles work together'], speakerNotes: 'This is the meat of the presentation. Use simple language first, then introduce technical terms.', visualSuggestion: 'Three-column layout with icons for each concept', transitionTip: 'Now that we understand the basics, let\'s see it in action' },
    { title: 'Real-World Example', bulletPoints: ['Case study or practical demonstration', 'Step-by-step walkthrough', 'Results and key observations'], speakerNotes: 'Show a concrete example. People remember stories and examples far better than abstract concepts.', visualSuggestion: 'Before/after comparison or process flow diagram', transitionTip: 'This example shows the ideal case — but what about challenges?' },
    { title: 'Common Challenges', bulletPoints: ['Challenge #1 and how to overcome it', 'Challenge #2 and the recommended approach', 'Mistakes to avoid'], speakerNotes: 'Being honest about challenges builds credibility. For each challenge, immediately offer a solution.', visualSuggestion: 'Problem → Solution comparison layout', transitionTip: 'Let\'s look at the data that supports these approaches' },
    { title: 'Data & Evidence', bulletPoints: ['Key research findings with statistics', 'Performance metrics or benchmarks', 'Comparative analysis'], speakerNotes: 'Support your claims with data. Use no more than 3 numbers per slide — audience can\'t absorb more.', visualSuggestion: 'Bar chart or infographic with 2-3 key statistics highlighted', transitionTip: 'Given all this evidence, here\'s what you should do next' },
    { title: 'Practical Takeaways', bulletPoints: ['Action item #1 you can implement today', 'Action item #2 for this week', 'Long-term recommendation'], speakerNotes: 'End with actionable items. Audience should leave knowing exactly WHAT to do next.', visualSuggestion: 'Numbered steps with icons, clean layout', transitionTip: 'To summarize everything we covered today...' },
    { title: 'Summary & Q&A', bulletPoints: ['Recap of the 3 key takeaways', 'Resources for further learning', 'Open floor for questions'], speakerNotes: 'Restate your 3 main points. Thank the audience. Open for questions with a warm, inviting tone.', visualSuggestion: 'Clean summary slide with contact info and resource links', transitionTip: 'Thank you! I\'m happy to answer any questions.' }
  ];
  const slides = [];
  for (let i = 0; i < n; i++) { const tmpl = slideTemplates[i % slideTemplates.length]; slides.push({ slideNum: i+1, ...tmpl }); }
  return { title: t, slides, overallTips: ['Practice at least 3 times before presenting', 'Maintain eye contact — look at audience, not slides', 'Use the 10-20-30 rule: max 10 slides, 20 minutes, 30pt minimum font', 'Pause after key points to let them sink in'], estimatedDuration: `${n*2} minutes`, audienceEngagementTips: ['Ask a question every 3-4 slides', 'Use a live poll or show of hands', 'Include a 30-second activity or reflection'] }; }

  _mockDreamPath(c) { return { careerGoal: c, timeline: '18-24 months with focused effort', currentGap: 'Need to build foundational technical skills, gain practical project experience, and develop professional network', phases: [{ phase: 1, title: 'Foundation Building', duration: '3 months', skills: ['Core programming (Python/JavaScript)', 'Mathematics fundamentals', 'Domain-specific basics'], courses: ['CS50x (Harvard)', 'Mathematics for CS (MIT OCW)', 'Domain intro course on Coursera'], projects: ['Personal portfolio website', 'Basic automation scripts', 'Data analysis mini-project'], milestones: ['Complete 3 online courses with certificates', 'Build and deploy first project', 'Start contributing to open source'], resources: ['freeCodeCamp', 'Khan Academy', 'GitHub Learning Lab'] }, { phase: 2, title: 'Skill Deepening', duration: '4 months', skills: ['Advanced frameworks and tools', 'System design basics', 'Domain expertise'], courses: ['Specialization course on Coursera/Udemy', 'System Design Primer', 'Industry-specific certification'], projects: ['Full-stack application', 'Team project (contribute to OSS)', 'Research/analysis project'], milestones: ['Earn 1 industry certification', 'Complete 2 significant projects', 'Start networking on LinkedIn/Twitter'], resources: ['LeetCode/HackerRank', 'Kaggle', 'Industry blogs and podcasts'] }, { phase: 3, title: 'Professional Launch', duration: '3 months', skills: ['Interview preparation', 'Professional communication', 'Industry-specific advanced skills'], courses: ['Interview prep course', 'Communication skills', 'Advanced specialization'], projects: ['Capstone/thesis project', 'Portfolio presentation', 'Technical blog posts'], milestones: ['Apply to 20+ positions', 'Complete 5 mock interviews', 'Secure internship or entry-level role'], resources: ['Glassdoor', 'AngelList', 'LinkedIn'] }], certifications: ['Google Professional Certificate', 'AWS/Azure Cloud Cert', 'Domain-specific professional certification'], internships: ['Summer internship at mid-size company', 'Open source mentorship program', 'Research assistantship'], portfolioProjects: ['End-to-end capstone project showcasing full skill set', 'Open source contribution with 50+ stars', 'Technical blog with 10+ published articles'], expectedSalary: '₹6-15 LPA (entry level, varies by city and company)', keyAdvice: 'Consistency beats intensity. Study 2 hours daily rather than 10 hours on weekends. Build in public — share your learning journey on social media. Network with people 1-2 steps ahead of you, not just at the top.', alternativePaths: ['Freelancing while building portfolio', 'Startup ecosystem (early-stage companies value skills over degrees)', 'Research track (if interested in academia)'] }; }

  _mockPlan(subjects) { const days = []; const topicMap = { 'Physics': ['Kinematics & Vectors', 'Newton\'s Laws', 'Work & Energy', 'Rotational Motion', 'Gravitation', 'Thermodynamics', 'Waves & Optics'], 'Math': ['Functions & Limits', 'Differentiation', 'Integration', 'Vectors & 3D', 'Probability', 'Matrices', 'Complex Numbers'], 'Chemistry': ['Atomic Structure', 'Chemical Bonding', 'Thermochemistry', 'Equilibrium', 'Organic Chemistry', 'Electrochemistry', 'Coordination Compounds'], 'default': ['Chapter 1: Fundamentals', 'Chapter 2: Core Theory', 'Chapter 3: Applications', 'Chapter 4: Advanced Topics', 'Chapter 5: Problem Solving', 'Chapter 6: Revision', 'Chapter 7: Mock Test'] };
  for (let i = 0; i < 7; i++) { const d = new Date(); d.setDate(d.getDate()+i); days.push({ day: i+1, date: d.toISOString().split('T')[0], sessions: subjects.map(s => { const topics = topicMap[s] || topicMap.default; return { subject: s, topic: topics[i % topics.length], duration: 60, type: ['learn','practice','revise','test'][i%4], priority: i < 3 ? 'high' : 'medium', spacedRepetition: i%3===0 }; }), totalMin: subjects.length*60 }); }
  return { title: `Smart Study Plan: ${subjects.join(' & ')}`, totalDays: 7, dailyPlans: days, weeklyGoals: ['Complete all scheduled chapters and practice sets', 'Take at least 2 mock quizzes per subject', 'Review and correct all mistakes from practice sessions', 'Maintain 25-min Pomodoro blocks with 5-min breaks'], spacedRepetition: subjects.map(s => ({ topic: s, reviewDays: [1,3,7,14,30] })), tips: ['Study hardest subjects when your energy is highest (usually morning)', 'Use 25-minute Pomodoro blocks — your brain needs breaks to consolidate learning', 'Before sleeping, spend 10 minutes reviewing key formulas — sleep helps memory consolidation', 'Alternate between subjects every 60-90 minutes to maintain freshness', 'Test yourself before re-reading notes — active recall is 3x more effective than passive review'], burnoutPrevention: 'If you feel fatigue: switch to a lighter subject, take a 15-min walk, or do a quick creative activity. Studying while exhausted is counterproductive — quality > quantity.' }; }

  _mockTimeline(t) { return { topic: t, timeline: [{ year: 1800, event: 'Early observations and foundational experiments', significance: 'First systematic study laid groundwork for the entire field', keyPerson: 'Early pioneers and natural philosophers', paradigmShift: false }, { year: 1850, event: 'Mathematical formalization of core principles', significance: 'Transformed from qualitative observations to quantitative science', keyPerson: 'Mathematical physicists and theorists', paradigmShift: true }, { year: 1900, event: 'Revolutionary discoveries challenged classical understanding', significance: 'Completely changed how scientists thought about the fundamentals', keyPerson: 'Nobel laureate researchers', paradigmShift: true }, { year: 1950, event: 'Technological applications became widespread', significance: 'Theory met practice — transforming industry and daily life', keyPerson: 'Engineers and applied scientists', paradigmShift: false }, { year: 1980, event: 'Computational methods enabled new discoveries', significance: 'Computers allowed simulation and modeling of complex systems', keyPerson: 'Computational researchers', paradigmShift: false }, { year: 2000, event: 'Integration with other fields created new disciplines', significance: 'Cross-disciplinary collaboration led to breakthrough applications', keyPerson: 'Interdisciplinary research teams', paradigmShift: true }, { year: 2020, event: 'AI and machine learning accelerated research', significance: 'AI tools now assist in discovery, prediction, and optimization', keyPerson: 'AI researchers and domain experts', paradigmShift: true }], currentUnderstanding: `Modern understanding of ${t} integrates classical theory with computational methods and AI-driven analysis. The field continues to evolve rapidly with new discoveries published weekly.`, futureDirections: `Key frontiers include: quantum-level understanding, AI-assisted discovery, sustainable applications, and personalized approaches. The next decade may bring transformative breakthroughs.`, funFact: `The fundamental principles of ${t} were initially considered so controversial that the pioneering researchers were ridiculed by their contemporaries — they were later vindicated and many won Nobel Prizes!` }; }
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
