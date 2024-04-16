var apiKey = '';
var conversationContext = [];
var model = "gpt-3.5-turbo";
var codeChunks = [];
var highProbBlocks = [];

function getSystemPrompt(){
    let systemPrompt = "You are an amazing web and app developer.";
    systemPrompt += " Your specialty is in React and React Native. Many developers";
    systemPrompt += " regard your ability to troubleshoot issues as unmatched.";

    return systemPrompt;
}

async function checkAndTrunc(conversationArray) {
    const joinedContext = conversationArray.map(item => item.content).join(" ");
    console.log('joinedContext:')
    console.log(joinedContext)
    console.log(`Joined context length: ${joinedContext.length}`);

    if (joinedContext.length > 20000) {
        // If greater than 25k, remove the first element
        conversationArray.shift();
        console.log(`Context too long, truncating. New length of array: ${conversationArray.length}`);
        // Call the function recursively to check again
        return checkAndTrunc(conversationArray);
    } else {
        // If less than 25k, return the original array
        console.log('Context within acceptable length.');
        return conversationArray;
    }
}

function buildPayload(model, msgs){
    // Prepare data for OpenAI API
    const data = JSON.stringify({
        model: model,
        messages: msgs
    });

    return data;
}

async function sendPayload(data){
    // Post data to the OpenAI API
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + apiKey
            },
            body: data
        });
    
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
    
        const responseData = await response.json();
        const latestResponse = responseData.choices[0].message.content;
        
        // Display the analysis results and possible solutions
        return latestResponse;
    } catch (error) {
        console.error('Error fetching the data:', error);
        let renderMsg = `An error occurred while processing your request.`;
        return renderMsg;
    }

}

async function showIssue(issueText){
    
    let systemPrompt = getSystemPrompt();
    conversationContext.push({
        'role':'system',
        'content': systemPrompt});

    let issuePrompt = 'I have found an issue on Github that could use your expertise.'
    issuePrompt += 'Here is the issue:\n'
    issuePrompt += issueText;
    issuePrompt += '\nNow I will send you some code so that we can find the part that is'
    issuePrompt += ' likely causing the issue mentioned above. Please let me know if you '
    issuePrompt += 'are ready.'

    conversationContext.push({
        'role':'user',
        'content': issuePrompt});

    let data = buildPayload(model, conversationContext);
    
    let resp = await sendPayload(data);

    conversationContext.push({
        'role':'assistant',
        'content': resp});

    // updateAnalysisResultsBox(resp);
    updateTargetResultsBox('analysisResult', resp)

    return resp;

}

async function checkChunkAgainstIssue(chunk, chunkIdx, issueText){

    let chunkPrompt = issueText;
    chunkPrompt += "\n How pertinent is the following code block to the above issue?";    
    chunkPrompt += "\n";
    chunkPrompt += chunk[0];
    chunkPrompt += "\n Please respond simply with only 2 words: either 'high probability', 'medium probability' ";
    chunkPrompt += "or 'low probability'. This abservation should be based on your own perception of how likely this code";
    chunkPrompt += " block affects the issue. Please restrict your response to as few words as possible.";

    conversationContext.push({
        'role':'user',
        'content': chunkPrompt});

    conversationContext = await checkAndTrunc(conversationContext);

    let data = buildPayload(model, conversationContext);
    
    let resp = await sendPayload(data);

    conversationContext.push({
        'role':'assistant',
        'content': resp});

    // updateAnalysisResultsBox(resp + ` (${chunk[1]})`, chunkIdx);
    updateTargetResultsBox('analysisResult', resp + ` (${chunk[1]})`, chunkIdx)

    if (resp.includes('high probability')||resp.includes('high pertinence')){
        highProbBlocks.push(chunk[1])
    }

    return resp;

}

async function requestSolutions(issueText){

    let solutionPrompt = issueText;
    solutionPrompt += "\n\n Given the above issue, you have identified a few problem areas.";    
    solutionPrompt += " Please give me high level ideas about how to correct those problem areas";
    solutionPrompt += " above that are labeled as high probability with respect to their pertinence";
    solutionPrompt += " to the GitHub issue. Be sure the corrections don't cause other problems."
    solutionPrompt += " Ideally, 2-3 solutions should be proposed.";

    conversationContext.push({
        'role':'user',
        'content': solutionPrompt});

    conversationContext = checkAndTrunc(conversationContext);

    let data = buildPayload(model, conversationContext);
    
    let resp = await sendPayload(data);

    conversationContext.push({
        'role':'assistant',
        'content': resp});

    // updateSolutionsResultsBox(resp);
    updateTargetResultsBox('solutions', resp)

    return resp;

}

async function requestCodedSolutions(){

    let codedSolutionsPrompt = "Please turn these high level correction suggestions into coded solutions.";
    codedSolutionsPrompt += " The solution's language should match the code block from before.";
    codedSolutionsPrompt += " For example, if the high probability code block was in TypeScript, the";
    codedSolutionsPrompt += " presented solution should also be in TypeScript. There should be a coded";
    codedSolutionsPrompt += " solution for each posited solution above.";

    conversationContext.push({
        'role':'user',
        'content': codedSolutionsPrompt});

    conversationContext = checkAndTrunc(conversationContext);

    let data = buildPayload(model, conversationContext);
    
    let resp = await sendPayload(data);

    conversationContext.push({
        'role':'assistant',
        'content': resp});

    // updateCodedSolutionsResultsBox(resp);
    updateTargetResultsBox('codedSolutions', resp)

    return resp;

}

// function updateTargetResultsBox(target, responseMsg, idx = 0){

//     responseMsg = responseMsg.replace('\n', '</p><p>');

//     const targetResultDiv = document.getElementById(target);
//     if (idx === 0){
//         targetResultDiv.innerHTML = ``;
//         targetResultDiv.innerHTML = `<p><strong>Response ${idx+1}:</strong> ${responseMsg}</p>`;
//     } else {
//         targetResultDiv.innerHTML += `<p><strong>Response ${idx+1}:</strong> ${responseMsg}</p>`;
//     }
// }

function updateTargetResultsBox(target, responseMsg, idx = 0){

    const targetResultDiv = document.getElementById(target);
    if (idx === 0){
        targetResultDiv.innerHTML = ``;
    } 

    targetResultDiv.innerHTML += marked(`**Response ${idx+1}:** ${responseMsg} \n`);
}

// function updateAnalysisResultsBox(responseMsg, idx = 0){

//     responseMsg = responseMsg.replace('\n', '</p><p>');

//     const analysisResultDiv = document.getElementById('analysisResult');
//     if (idx === 0){
//         analysisResultDiv.innerHTML = ``;
//         analysisResultDiv.innerHTML = `<p><strong>Response ${idx+1}:</strong> ${responseMsg}</p>`;
//     } else {
//         analysisResultDiv.innerHTML += `<p><strong>Response ${idx+1}:</strong> ${responseMsg}</p>`;
//     }
// }

document.getElementById('apiKeyButton').addEventListener('click', function() {
    document.getElementById('apiKeyModal').style.display = 'block';
});

document.getElementsByClassName('close')[0].addEventListener('click', function() {
    document.getElementById('apiKeyModal').style.display = 'none';
});

document.getElementById('saveApiKey').addEventListener('click', function() {
    apiKey = document.getElementById('apiKeyInput').value;
    sessionStorage.setItem('openaiApiKey', apiKey);
    document.getElementById('apiKeyModal').style.display = 'none';
});

// Use `apiKey` in your fetch headers
document.getElementById('analyzeButton').addEventListener('click', async function() {
    const issueText = document.getElementById('issueText').value;
    const analysisResultDiv = document.getElementById('analysisResult');
    const solutionsDiv = document.getElementById('solutions');
    
    // Modify your existing fetch calls
    const apiKey = sessionStorage.getItem('openaiApiKey');
    if (!apiKey) {
        alert('API key is not set. Please set your API key.');
        return;
    }
    
    // Clear previous results
    analysisResultDiv.innerHTML = '';
    solutionsDiv.innerHTML = '';
    
    if (issueText.trim() === '') {
        alert('Please paste the GitHub issue before analyzing.');
        return;
    }
    
    let analyzeIssueResp = await showIssue(issueText);

});

document.getElementById('ingestButton').addEventListener('click', function() {
    const filesInput = document.getElementById('codeFiles');
    const files = filesInput.files;
    if (files.length === 0) {
        alert('Please upload code files first.');
        return;
    }

    codeChunks = [];  // Clear previous chunks
    let promises = []; // Array to hold promises for each file read operation

    Array.from(files).forEach(file => {
        // Create a new promise for each file read operation
        const promise = new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                const content = e.target.result;
                // Example chunking: split file into chunks of 1000 characters
                // with an overlap of 250 between each chunk
                const chunkSize = 1000;
                for (let i = 0; i < content.length; i += 750) {
                    const chunk = content.slice(i, i + chunkSize);
                    codeChunks.push([chunk, file.name]);
                }
                resolve(); // Resolve the promise when the file is read
            };
            reader.onerror = reject; // Reject the promise on read error
            reader.readAsText(file);
        });

        promises.push(promise);
    });

    // Wait for all file read operations to complete
    Promise.all(promises).then(() => {
        let ingestMsg = "Files ingested and processed. Ready for Github Issue. ";
        ingestMsg += "Number of chunks: " + codeChunks.length;
        updateTargetResultsBox('analysisResult',ingestMsg);
    }).catch(error => {
        console.error("Error reading files: ", error);
        updateTargetResultsBox('analysisResult',"Error reading files: " + String(error));
    });
});


// Scan code chunks for parts that match issue
document.getElementById('scanButton').addEventListener('click', async function() {
    const issueText = document.getElementById('issueText').value;
    if (issueText.trim() === '') {
        alert('Please enter an issue description first.');
        return;
    }

    for(const [chunkIdx, chunk] of codeChunks.entries()){
        let chunkCheck = await checkChunkAgainstIssue(chunk, chunkIdx, issueText);
        console.log(chunkCheck);
    }
});

// Fix code chunks with issues in a way that solves issue without causing other issues
document.getElementById('solutionButton').addEventListener('click', async function() {
    const issueText = document.getElementById('issueText').value;
    if (issueText.trim() === '') {
        alert('Please enter an issue description first.');
        return;
    }

    let reqSol = await requestSolutions();
    console.log(reqSol);
    let codeSol = await requestCodedSolutions();
    console.log(codeSol);
});