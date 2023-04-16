import { Configuration, OpenAIApi } from 'openai'

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
})
const openai = new OpenAIApi(configuration)

export default async function (req, res) {
  if (!configuration.apiKey) {
    res.status(500).json({
      error: {
        message:
          'OpenAI API key not configured, please follow instructions in README.md',
      },
    })
    return
  }

  const topic = req.body.topic || ''
  if (topic.trim().length === 0) {
    res.status(400).json({
      error: {
        message: 'Please enter a valid topic',
      },
    })
    return
  }

  try {
    // Fetch the transcript from the fetch_transcript endpoint
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL

    const transcriptResponse = await fetch(`${apiUrl}/api/fetch_transcript`)

    const transcriptData = await transcriptResponse.json()

    const transcript = transcriptData.transcript

    //console.log(transcript)

    // Break the transcript into smaller chunks
    const maxTranscriptLength = 4000 - topic.length - 100
    const transcriptChunks = splitTranscript(transcript, maxTranscriptLength)

    let results = []

    for (const chunk of transcriptChunks) {
      const completion = await openai.createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages: generateMessages(topic, chunk),
        temperature: 0.6,
      })

      console.log('Completion:', completion.data.choices[0].message.content)

      results.push(completion.data.choices[0].message.content)
    }

    // Combine the results from each chunk
    const combinedResults = results.join('\n')

    console.log('Combined results:', combinedResults)

    const finalMaxTranscriptLength = 4000 - topic.length - 100
    const finalTranscriptChunks = splitTranscript(
      combinedResults,
      finalMaxTranscriptLength
    )

    let finalResults = []
    for (const chunk of finalTranscriptChunks) {
      const completion = await openai.createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages: generateFinalMessages(topic, chunk),
        temperature: 0.6,
      })

      console.log(
        'Final Completion:',
        completion.data.choices[0].message.content
      )

      finalResults.push(completion.data.choices[0].message.content)
    }
    console.log('Final Results:', finalResults)

    console.log('Final Combined Results:', finalResults.join('\n'))

    const finalCombinedResults = finalResults.join('\n')

    const timestamped = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: generateTimeStamps(finalCombinedResults),
      temperature: 0.6,
    })

    console.log('Timestamped:', timestamped.data.choices[0].message.content)

    const jsonObject = JSON.parse(timestamped.data.choices[0].message.content)
    res.status(200).json({ result: jsonObject })
  } catch (error) {
    // Consider adjusting the error handling logic for your use case
    if (error.response) {
      console.error(error.response.status, error.response.data)
      res.status(error.response.status).json(error.response.data)
    } else {
      console.error(`${error.message}`)
      res.status(500).json({
        error: {
          message: 'An error occurred during your request.',
        },
      })
    }
  }
}

function generateMessages(topic, transcript) {
  return [
    {
      role: 'system',
      content:
        'You are a helpful assistant that finds specific sections in a chunk of a podcast transcript. You get the topic as input, and return a list of text snippets that contain the topic. You give the answer directly without introducing it. for example, "Here are the text snippets containing the topic..." is not good. you just list the snippets directly. if the chunk does not contain any discussion about the specified topic, you simply respond with an empty string.',
    },
    {
      role: 'user',
      content: `Find the section in the following transcript where they discuss '${topic}'. the transcript is formatted like this "startTime- endTime: text"
      keep the formatting so we keep track when the transcript was said: ${transcript}`,
    },
  ]
}
function splitTranscript(transcript, maxTranscriptLength) {
  const chunks = []
  let startIndex = 0

  while (startIndex < transcript.length) {
    let endIndex = startIndex + maxTranscriptLength
    if (endIndex < transcript.length) {
      endIndex = transcript.lastIndexOf(' ', endIndex)
    }
    const chunk = transcript.substring(startIndex, endIndex)
    chunks.push(chunk)
    startIndex = endIndex + 1
  }

  return chunks
}

function generateFinalMessages(topic, transcript) {
  return [
    {
      role: 'system',
      content:
        'You are a helpful assistant that finds specific sections in a timestamped podcast transcript. You get the topic as input, and return a list of text snippets that contain the topic. You give the answer directly without introducing it. for example, "Here are the text snippets containing the topic..." is not good. you just list the snippets directly. if the chunk does not contain any discussion about the specified topic, you simply respond with an empty string.',
    },
    {
      role: 'user',
      content: `The following is a list of transcripts. formatted like this "startTime- endTime: text"
      keep the formatting so we keep track when the transcript was said. which ones talk about '${topic}': ${transcript}`,
    },
  ]
}

function generateTimeStamps(topic, text) {
  return [
    {
      role: 'system',
      content: 'You are a helpful assistant.',
    },
    {
      role: 'user',
      content: `I have a list of text snippets discussing the topic '${topic}', with timestamps in the format "start time - end time". For each section discussing the topic, please provide the start time of the first timestamp and the end time of the last timestamp. The text snippets are as follows: ${text} \n
      
      Please provide ONLY the start and end times for each section in the format "start time - end time" IN A JSON array FORMAT like 
      [
        { "start": 2564.28, "end": 2577.60 }]`,
    },
  ]
}

// function generateFinalMessages(topic, transcript) {
//   return [
//     {
//       role: 'system',
//       content:
//         'You are a helpful assistant that finds specific sections in a chunk of a podcast transcript. You get the topic as input, and return a list of text snippets that contain the topic. You give the answer directly without introducing it. for example, "Here are the text snippets containing the topic..." is not good. you just list the snippets directly. if the chunk does not contain any discussion about the specified topic, you simply respond with an empty string.',
//     },
//     {
//       role: 'user',
//       content: `The following is a list of transcripts. find the ones where they talk about '${topic}', ignore the ones who don't: ${transcript}`,
//     },
//   ]
// }
