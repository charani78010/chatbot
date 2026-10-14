const OLLAMA_URL = 'http://localhost:11434/api/chat';
const STORAGE_KEY = 'interviewmate-progress-v1';
const CHAT_STORAGE_KEY = 'interviewmate-chat-v1';
const PROFILE = 'You are InterviewMate AI, an experienced HR interviewer and supportive interview coach. Your learner is a beginner and a 4th-year B.Tech student in Computer Science and Engineering (Artificial Intelligence), applying for fresher software developer and IT jobs. They have no stated work experience. Only treat facts the learner actually shared as true. IMPORTANT: Never say or imply that this learner has completed a project, internship, job, achievement, college activity, or other experience unless they personally described it. Do not guess what a typical student might have done. In particular, NEVER claim "I have worked on projects", "I have been working on projects", "I built", "I developed", or similar unless the learner actually said so. A sample answer must not make up any personal fact, even as a plausible example. Use [your project], [a real example], and similar clear placeholders for missing details. An example with a placeholder must not say the learner actually did it. When details are missing, say so and ask the learner. Before responding, check the sample answer and replace every unverified personal claim with a clear placeholder. A safe self-introduction using only known facts is: "I am a 4th-year B.Tech student in Computer Science and Engineering (Artificial Intelligence), applying for fresher software developer roles. I am looking forward to learning and growing in my first role." Use simple English, short sentences, practical examples, and a kind, constructive tone. Help the learner build answers only from genuine studies, projects, or personal learning they share. Explain how to sound natural and confident. For ordinary HR interview questions, answer with these headings: A. Interview Question; B. What the HR Interviewer Wants to Know; C. Sample Answer for a Fresher; D. Why This Answer Works; E. Personalisation; F. Speaking Tip; G. Practice. Keep sample answers short enough to say aloud. For the sample answer, stick to the known student profile and use explicit placeholders for everything else. If the user asks for communication guidance, answer directly and include a useful practice prompt. For mock interviews, obey the mock instructions in the user message: do not show a model answer before the learner responds, ask one question at a time, and give constructive feedback.';
const PROMPTS = ['Tell me about yourself.', 'Why should we hire you?', 'What are your strengths and weaknesses?', 'Why do you want to join our company?', 'Where do you see yourself in five years?', 'Start a mock HR interview.'];
const CATEGORIES = [
  {title:'Basic HR Questions',icon:'✧',description:'Build a clear, confident answer to the questions almost every interviewer asks.',questions:['Tell me about yourself.','Introduce yourself.','Why should we hire you?','What are your strengths?','What are your weaknesses?','Why do you want this job?','What motivates you?']},
  {title:'Fresher-Specific',icon:'🎓',description:'Talk about your studies and potential when you are starting your career.',questions:['Why should we hire you without work experience?','What did you learn during your degree?','Tell me about your academic projects.','Describe your internship experience.','How do you handle a task you don’t understand?','Are you willing to learn new technologies?','How do you handle feedback?']},
  {title:'Behavioural Questions',icon:'◎',description:'Use genuine college and personal examples to show how you work with others.',questions:['Tell me about a challenge you faced.','Describe a time you worked in a team.','How do you handle failure?','How do you manage deadlines?','How do you resolve disagreements?','Tell me about a mistake and what you learned from it.']},
  {title:'Career & Company',icon:'↗',description:'Explain your goals, interest in the role, and thoughtful questions for a company.',questions:['Why do you want to join our company?','Where do you see yourself in five years?','What are your career goals?','Why did you choose Computer Science?','Why do you want to become a software developer?','What salary do you expect?','Do you have any questions for us?']},
  {title:'Communication & Professionalism',icon:'☏',description:'Practise the small moments that help you feel at ease and make a good impression.',questions:['How should I greet an interviewer?','How can I introduce myself confidently?','How do I ask for clarification?','How should I answer when I don’t know something?','How do I end an interview politely?','What common interview mistakes should I avoid?']}
];
const $ = (selector) => document.querySelector(selector);
const historyEl = $('#chat-history');
const inputEl = $('#message-input');
const sendButton = $('#send-button');
const suggestionsEl = $('#suggestions');
const mockSettings = $('#mock-settings');
const state = {
  busy:false, mode:'coach', messages:[], mock:null,
  progress:loadProgress()
};

function loadProgress(){
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if(saved && Array.isArray(saved.sessions)) return {sessions:saved.sessions, mocks:Number(saved.mocks)||0};
  } catch(error) { console.warn('Could not read saved practice progress.', error); }
  return {sessions:[],mocks:0};
}
function saveProgress(){
  try { localStorage.setItem(STORAGE_KEY,JSON.stringify(state.progress)); }
  catch(error){ showError('Your practice was not saved in this browser. Check that local storage is available.'); console.error('Could not save practice progress.',error); }
  renderProgress();
}
function loadChat(){
  try {
    const saved=JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY));
    if(saved && Array.isArray(saved.messages)) state.messages=saved.messages.filter(message=>['user','assistant'].includes(message.role)&&typeof message.content==='string');
  } catch(error){console.warn('Could not restore the previous chat.',error);}
  if(!state.messages.length) state.messages=[{role:'assistant',content:"Hello! Welcome to InterviewMate AI. I'm your personal HR interview coach. Don't worry if this is your first interview. I'll teach you common HR questions, help you create good answers, and practise interviews with you step by step. What would you like to practise today?"}];
}
function saveChat(){
  try {localStorage.setItem(CHAT_STORAGE_KEY,JSON.stringify({messages:state.messages.slice(-30)}));}
  catch(error){console.warn('Could not save the current chat locally.',error);}
}
function renderMessage(role,content){
  const row=document.createElement('div');
  row.className=`message-row ${role}`;
  const avatar=document.createElement('div');
  avatar.className='message-avatar';
  avatar.textContent=role==='assistant'?'✳':'YOU';
  const bubble=document.createElement('div');
  bubble.className='message-bubble';
  content.split(/\n+/).filter(Boolean).forEach((line)=>{
    const paragraph=document.createElement('p');
    paragraph.textContent=line.replace(/\*\*/g,'');
    bubble.append(paragraph);
  });
  row.append(avatar,bubble);
  historyEl.append(row);
  historyEl.scrollTop=historyEl.scrollHeight;
  return row;
}
function repaintChat(){
  historyEl.replaceChildren();
  state.messages.forEach(message=>renderMessage(message.role,message.content));
  historyEl.scrollTop=historyEl.scrollHeight;
}
function addMessage(role,content){
  state.messages.push({role,content});
  renderMessage(role,content);
  saveChat();
}
function setBusy(busy){
  state.busy=busy;
  sendButton.disabled=busy;
  inputEl.disabled=busy;
  sendButton.querySelector('span:first-child').textContent=busy?'Thinking':'Send';
  if(busy){
    const row=document.createElement('div');
    row.className='message-row assistant';
    row.id='typing-row';
    const avatar=document.createElement('div');avatar.className='message-avatar';avatar.textContent='✳';
    const bubble=document.createElement('div');bubble.className='message-bubble typing-indicator';bubble.setAttribute('aria-label','Coach is typing');
    bubble.innerHTML='<i></i><i></i><i></i>';
    row.append(avatar,bubble);historyEl.append(row);historyEl.scrollTop=historyEl.scrollHeight;
  }else $('#typing-row')?.remove();
}
function showError(message){
  const box=$('#chat-error');
  box.textContent=message;
  box.hidden=false;
}
function clearError(){const box=$('#chat-error');box.hidden=true;box.textContent='';}
function setConnection(status,label){
  const pill=$('#connection-status');pill.dataset.state=status;$('#connection-label').textContent=label;
}
async function checkConnection(){
  setConnection('checking','Checking your local AI...');
  try {
    const response=await fetch('http://localhost:11434/api/tags',{signal:AbortSignal.timeout(4000)});
    if(!response.ok) throw new Error(`Ollama returned HTTP ${response.status}.`);
    setConnection('connected','Ollama is connected');
  } catch(error){
    setConnection('error','Ollama is not connected');
    console.info('Ollama connection check:',error.message);
  }
}
async function askOllama(messages,system=PROFILE){
  const response=await fetch(OLLAMA_URL,{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({model:$('#model-select').value,stream:false,messages:[{role:'system',content:system},...messages]}),
    signal:AbortSignal.timeout(120000)
  });
  if(!response.ok){
    let detail='';
    try{const errorBody=await response.json();detail=errorBody.error||'';}catch{}
    throw new Error(detail||`Ollama returned HTTP ${response.status}.`);
  }
  const data=await response.json();
  if(typeof data.message?.content!=='string'||!data.message.content.trim()) throw new Error('The selected model returned an empty reply. Please try again.');
  setConnection('connected','Ollama is connected');
  return data.message.content.trim();
}
function selectedHistory(){
  return state.messages.filter((message,index)=>index>0||message.role==='user').slice(-14);
}
function updateMockControl(){
  $('#start-mock').textContent=state.mock?'Restart interview →':'Start interview →';
}
async function coachSend(rawText){
  const content=rawText.trim();
  if(!content||state.busy)return;
  clearError();
  $('#suggested-wrap').hidden=true;
  addMessage('user',content);
  const isMockAnswer=state.mode==='mock'&&state.mock;
  const topic=state.mode==='mock'?'Mock interview':(CATEGORIES.find(category=>category.questions.some(question=>content.toLowerCase().includes(question.toLowerCase().replace(/[?.]/g,''))))?.title||'HR practice');
  setBusy(true);
  try{
    const mockFeedback=state.mode==='mock'
      ?`${PROFILE} For this mock-interview answer, give short constructive feedback under these headings, each on its own line: Relevance, Clarity, Grammar, Professionalism, Strong point, One improvement, Stronger version. Base feedback only on what the learner actually wrote. In the stronger version, preserve their facts and use placeholders for details they did not share. Do not ask the next question yet.`
      :PROFILE;
    const reply=await askOllama(selectedHistory(),mockFeedback);
    addMessage('assistant',reply);
    const strength=isMockAnswer?extractFeedbackSection(reply,'Strong point',['One improvement','Stronger version']):'';
    const improvement=isMockAnswer?extractFeedbackSection(reply,'One improvement',['Stronger version']):'';
    state.progress.sessions.push({
      topic,
      question:isMockAnswer?(state.mock.currentQuestion||'Mock interview question'):content,
      answer:reply,
      attempt:isMockAnswer?content:undefined,
      strength,
      improvement,
      date:new Date().toISOString()
    });
    saveProgress();
    if(state.mode==='mock'&&state.mock){
      state.mock.answers.push({question:state.mock.currentQuestion||content,answer:content,feedback:reply});
      state.mock.currentQuestion=null;
      if(state.mock.answers.length>=state.mock.length){
        await finishMock();
      }else{
        showContinueButton();
      }
    }
  }catch(error){
    console.error('Ollama chat request failed:',error);
    setConnection('error','Ollama connection issue');
    state.messages.pop();
    saveChat();
    repaintChat();
    inputEl.value=content;
    inputEl.style.height='auto';
    inputEl.style.height=`${Math.min(inputEl.scrollHeight,100)}px`;
    showError(`${friendlyError(error)} Your message was restored to the input—check the connection and press Send to retry.`);
  }finally{setBusy(false);inputEl.focus();}
}
function friendlyError(error){
  if(error.name==='TimeoutError')return 'Ollama took too long to respond.';
  if(error instanceof TypeError)return 'Could not reach Ollama. Check that Ollama is running and its browser access is configured.';
  return error.message||'Something went wrong while contacting Ollama.';
}
function extractFeedbackSection(text,section,nextSections){
  const escaped=section.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const next=nextSections.map(label=>label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|');
  const boundary=next?`(?=\\n\\s*(?:#{1,6}\\s*)?(?:[-*]\\s*)?\\*{0,2}(?:${next})\\*{0,2}\\s*[:\\-–]?|$)`:'$';
  const expression=new RegExp(`(?:^|\\n)\\s*(?:#{1,6}\\s*)?(?:[-*]\\s*)?\\*{0,2}${escaped}\\*{0,2}\\s*[:\\-–]?\\s*([\\s\\S]*?)${boundary}`,'i');
  return expression.exec(text)?.[1]?.replace(/\*\*/g,'').trim().slice(0,220)||'';
}
function classifyImprovement(text){
  const value=text.toLowerCase();
  if(/example|specific detail|star method|relevance/.test(value))return 'Add one specific, genuine example';
  if(/grammar|tense|sentence/.test(value))return 'Review grammar and sentence clarity';
  if(/concise|shorter|too long|brief/.test(value))return 'Keep answers concise';
  if(/confidence|hesitat|direct wording/.test(value))return 'Use more direct, confident wording';
  if(/structure|organis|order|clear sequence/.test(value))return 'Organise answers in a clear order';
  return text.trim().replace(/\s+/g,' ').slice(0,130);
}
function showContinueButton(){
  const existing=$('#continue-mock');
  if(existing)existing.remove();
  const button=document.createElement('button');
  button.id='continue-mock';button.className='button button-primary button-small continue-mock';button.textContent='Ready for the next question →';
  button.addEventListener('click',continueMock);
  historyEl.append(button);historyEl.scrollTop=historyEl.scrollHeight;
}
async function startMock(){
  if(state.busy)return;
  clearError();
  state.mode='mock';
  state.mock={difficulty:$('#difficulty-select').value,length:Number($('#length-select').value),answers:[],currentQuestion:null};
  historyEl.replaceChildren();
  addMessage('assistant',`Let’s begin your ${state.mock.difficulty.toLowerCase()} mock interview. I’ll ask ${state.mock.length} questions, one at a time. Answer naturally, as if we were speaking in person.`);
  await requestNextQuestion(true);
}
async function continueMock(){if(!state.mock||state.busy)return;$('#continue-mock')?.remove();await requestNextQuestion(false);}
async function requestNextQuestion(first){
  setBusy(true);clearError();
  const previousQuestions=state.mock.answers.map((item,index)=>`Question ${index+1}: ${item.question}`).join('\n');
  const mockInstruction=first
    ?`We are starting a ${state.mock.difficulty} mock HR interview for a fresher applying to a software developer job. There will be ${state.mock.length} questions total. Ask only the first, realistic, open-ended HR question now. Do not answer it, provide examples, give feedback, or list further questions.`
    :`Continue this ${state.mock.difficulty} fresher software-job mock interview. The learner has answered ${state.mock.answers.length} of ${state.mock.length} questions. Their previous answer has already received feedback. Ask only the next distinct, relevant HR question. Do not repeat any question listed here, give a model answer, give more feedback, or reveal future questions.\n\nQuestions already asked:\n${previousQuestions}`;
  try{
    const reply=await askOllama([{role:'user',content:mockInstruction}],PROFILE);
    addMessage('assistant',reply);
    state.mock.currentQuestion=reply;
  }catch(error){
    console.error('Could not start or continue the mock interview:',error);
    setConnection('error','Ollama connection issue');
    showError(`${friendlyError(error)} You can retry by pressing “${first?'Start interview':'Ready for the next question'}” again.`);
    const retry=$('#start-mock');retry.textContent=first?'Retry interview →':'Start interview →';
    if(!first)showContinueButton();
  }finally{setBusy(false);}
}
async function finishMock(manageBusy=false){
  const completed=state.mock;
  if(!completed)return;
  if(manageBusy)setBusy(true);
  $('#retry-report')?.remove();
  try{
    const transcript=completed.answers.map((item,index)=>`Q${index+1}: ${item.question}\nAnswer: ${item.answer}\nCoach feedback: ${item.feedback}`).join('\n\n');
    const report=await askOllama([{role:'user',content:`The ${completed.difficulty} mock interview is complete (${completed.length} questions). Based only on this transcript, give a short final report with these headings: Strengths, Areas to improve, Suggested practice topics. Be kind and specific, and do not invent facts. Do not add another interview question.\n\n${transcript}`}],PROFILE);
    addMessage('assistant',`Your mock interview is complete!\n\n${report}`);
    state.progress.mocks+=1;
    saveProgress();
    state.mock=null;
    state.mode='coach';
    mockSettings.hidden=true;
    document.querySelectorAll('.practice-tab').forEach(tab=>tab.classList.toggle('selected',tab.dataset.practice==='coach'));
  }catch(error){
    console.error('Could not create the mock interview report:',error);
    showError(`${friendlyError(error)} Your mock answers and feedback are still in the chat. Retry the report when Ollama is available.`);
    const retry=document.createElement('button');
    retry.id='retry-report';retry.type='button';retry.className='button button-primary button-small continue-mock';retry.textContent='Retry final report →';
    retry.addEventListener('click',()=>finishMock(true));
    historyEl.append(retry);historyEl.scrollTop=historyEl.scrollHeight;
  }finally{
    if(manageBusy)setBusy(false);
  }
}
function renderCategories(){
  const grid=$('#category-grid');
  CATEGORIES.forEach(category=>{
    const card=document.createElement('button');card.type='button';card.className='category-card';
    const icon=document.createElement('span');icon.className='category-icon';icon.textContent=category.icon;
    const title=document.createElement('h3');title.textContent=category.title;
    const description=document.createElement('p');description.textContent=category.description;
    const count=document.createElement('span');count.className='category-count';count.textContent=`${category.questions.length} practice questions`;
    const arrow=document.createElement('span');arrow.className='category-arrow';arrow.textContent='→';
    card.append(icon,title,description,count,arrow);
    card.setAttribute('aria-label',`${category.title}: show practice questions`);
    card.addEventListener('click',()=>showCategoryQuestions(category));
    grid.append(card);
  });
}
function showCategoryQuestions(category){
  const wrapper=$('#suggested-wrap');wrapper.hidden=false;
  const label=wrapper.querySelector('.suggested-label');label.textContent=`${category.title.toUpperCase()} · PICK A QUESTION`;
  suggestionsEl.replaceChildren();
  category.questions.forEach(question=>{
    const chip=document.createElement('button');chip.type='button';chip.className='suggestion-chip';chip.textContent=question;
    chip.addEventListener('click',()=>{if(state.busy)return;state.mode='coach';mockSettings.hidden=true;coachSend(question);document.querySelector('#practice').scrollIntoView({behavior:'smooth'});});
    suggestionsEl.append(chip);
  });
  document.querySelector('#practice').scrollIntoView({behavior:'smooth'});
}
function renderSuggestions(){
  PROMPTS.forEach(prompt=>{
    const chip=document.createElement('button');chip.type='button';chip.className='suggestion-chip';chip.textContent=prompt;
    chip.addEventListener('click',()=>{
      if(state.busy)return;
      if(prompt.toLowerCase().startsWith('start a mock')){switchToMock();return;}
      state.mode='coach';mockSettings.hidden=true;coachSend(prompt);
    });
    suggestionsEl.append(chip);
  });
}
function renderProgress(){
  const sessions=state.progress.sessions;
  $('#stat-questions').textContent=sessions.length;
  $('#stat-mocks').textContent=state.progress.mocks;
  const topics=new Set(sessions.map(item=>item.topic));
  $('#stat-topics').textContent=topics.size;
  $('#stat-answers').textContent=sessions.filter(item=>typeof item.attempt==='string'&&item.attempt.trim()).length;
  $('#stat-questions-note').textContent=sessions.length?`${sessions.length} real ${sessions.length===1?'practice session':'practice sessions'} saved on this device.`:'Your journey starts here.';
  $('#stat-mocks-note').textContent=state.progress.mocks?'You showed up and practised. Keep it going!':'Ready when you are.';
  const wins=$('#strong-answers');wins.replaceChildren();
  const recent=[...sessions].reverse().filter(item=>item.strength).slice(0,3);
  if(!recent.length){wins.innerHTML='<li>Finish a mock answer to see coach feedback here.</li>';}
  else recent.forEach(item=>{const li=document.createElement('li');li.textContent=`${item.question.length>58?`${item.question.slice(0,55)}...`:item.question} — ${item.strength}`;wins.append(li);});
  const signals=$('#improve-signals');signals.replaceChildren();
  const frequencies=new Map();
  sessions.filter(item=>item.improvement).forEach(item=>{
    const signal=classifyImprovement(item.improvement);
    frequencies.set(signal,(frequencies.get(signal)||0)+1);
  });
  const repeated=[...frequencies.entries()].sort((first,second)=>second[1]-first[1]).slice(0,3);
  if(!repeated.length){signals.innerHTML='<li>Repeated feedback patterns will appear after mock practice.</li>';}
  else repeated.forEach(([signal,count])=>{const li=document.createElement('li');li.textContent=`${signal}${count>1?` · noted ${count} times`:' · first noted'}`;signals.append(li);});
  const next=$('#improve-topics');next.replaceChildren();
  const topicCounts=new Map(CATEGORIES.map(category=>[category.title,sessions.filter(item=>item.topic===category.title).length]));
  CATEGORIES.slice().sort((first,second)=>topicCounts.get(first.title)-topicCounts.get(second.title)).slice(0,3).forEach(category=>{
    const li=document.createElement('li');
    li.textContent=`Practise ${category.title.toLowerCase()}${topicCounts.get(category.title)?` (${topicCounts.get(category.title)} explored)`:''}`;
    next.append(li);
  });
}
function switchToMock(){
  if(state.busy)return;
  state.mode='mock';mockSettings.hidden=false;
  document.querySelectorAll('.practice-tab').forEach(tab=>tab.classList.toggle('selected',tab.dataset.practice==='mock'));
  document.querySelector('#practice').scrollIntoView({behavior:'smooth'});
}
function clearConversation(){
  if(state.busy)return;
  if(!window.confirm('Clear your chat on this device? Your progress dashboard will stay saved.'))return;
  state.messages=[{role:'assistant',content:"Hello! Welcome to InterviewMate AI. I'm your personal HR interview coach. Don't worry if this is your first interview. I'll teach you common HR questions, help you create good answers, and practise interviews with you step by step. What would you like to practise today?"}];
  state.mock=null;state.mode='coach';mockSettings.hidden=true;
  saveChat();repaintChat();clearError();$('#suggested-wrap').hidden=false;
}
function init(){
  loadChat();repaintChat();renderCategories();renderSuggestions();renderProgress();updateMockControl();checkConnection();
  $('#chat-form').addEventListener('submit',event=>{event.preventDefault();const message=inputEl.value;inputEl.value='';inputEl.style.height='auto';coachSend(message);});
  inputEl.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();$('#chat-form').requestSubmit();}});
  inputEl.addEventListener('input',()=>{inputEl.style.height='auto';inputEl.style.height=`${Math.min(inputEl.scrollHeight,100)}px`;});
  $('#clear-chat').addEventListener('click',clearConversation);
  $('#start-mock').addEventListener('click',startMock);
  $('#hero-mock').addEventListener('click',switchToMock);
  document.querySelectorAll('.practice-tab').forEach(tab=>tab.addEventListener('click',()=>{
    if(state.busy)return;
    if(tab.dataset.practice==='mock')switchToMock();
    else{state.mode='coach';state.mock=null;mockSettings.hidden=true;document.querySelectorAll('.practice-tab').forEach(item=>item.classList.toggle('selected',item===tab));}
  }));
  $('#reset-progress').addEventListener('click',()=>{
    if(!window.confirm('Reset your saved practice counts and dashboard? This will not clear your chat.'))return;
    state.progress={sessions:[],mocks:0};
    try{localStorage.removeItem(STORAGE_KEY);}catch(error){console.error('Could not reset saved progress.',error);}
    renderProgress();
  });
  $('#menu-toggle').addEventListener('click',()=>{
    const nav=$('#main-nav');const open=nav.classList.toggle('open');
    $('#menu-toggle').setAttribute('aria-expanded',String(open));
    $('#menu-toggle').setAttribute('aria-label',open?'Close navigation':'Open navigation');
  });
  document.querySelectorAll('.nav-link').forEach(link=>link.addEventListener('click',()=>{
    $('#main-nav').classList.remove('open');$('#menu-toggle').setAttribute('aria-expanded','false');
    document.querySelectorAll('.nav-link').forEach(item=>item.classList.toggle('active',item===link));
  }));
}
init();
