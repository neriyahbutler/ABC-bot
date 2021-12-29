const fs = require('fs')
const dialogflow = require('dialogflow')
const uuid = require('uuid')

const projectId = 'sound-country-334917'

async function detectAudioIntent(
    inputAudio,
    encoding,
    sampleRateHertz
) {
    let config = JSON.parse(fs.readFileSync('config.json'))
    let languageCode = config.language

    const sessionClient = new dialogflow.SessionsClient()
    const sessionId = uuid.v4();

    const sessionPath = sessionClient.sessionPath(
        projectId,
        sessionId
    )

    const request = {
        session: sessionPath,
        queryInput: {
            audioConfig: {
                audioEncoding: encoding,
                sampleRateHertz: sampleRateHertz,
                languageCode: languageCode,
            },
        },
        inputAudio: inputAudio
    }

    const [response] = await sessionClient.detectIntent(request)
    const result = response.queryResult

    console.log(`The response returned was ${response}`)

    return result
}

module.exports = { detectAduioIntent }