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

  const videoId = req.body.videoId || ''

  if (videoId.trim().length === 0) {
    res.status(400).json({
      error: {
        message: 'Please enter a valid link to a YouTube video.',
      },
    })
    return
  }

  try {
    // Fetch the transcript from the fetch_transcript endpoint
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL

    const transcriptResponse = await fetch(
      `${apiUrl}/api/fetch_transcript?videoId=${videoId}`
    )

    const transcriptData = await transcriptResponse.json()

    const transcript = transcriptData.transcript

    //console.log(transcript)

    // Break the transcript into smaller chunks
    const maxTranscriptLength = 3900
    const transcriptChunks = splitTranscript(transcript, maxTranscriptLength)

    let results = []

    const completion = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: generateMessages(transcriptChunks[0]), //for now, we'll use only the first chunk
      temperature: 0.6,
    })

    console.log('Completion:', completion.data.choices[0].message.content)

    results.push(completion.data.choices[0].message.content)

    // Combine the results from each chunk
    const combinedResults = results.join('\n')

    console.log('Combined results:', combinedResults)

    const timestamped = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: generateTimeStamps(combinedResults),
      temperature: 0.6,
    })

    console.log('Timestamped:', timestamped.data.choices[0].message.content)

    const jsonObject = JSON.parse(timestamped.data.choices[0].message.content)

    const filteredJsonObject = jsonObject.filter(({ start, end }) => {
      return end - start >= 15
    })

    console.log('Filtered Timestamps:', filteredJsonObject)

    res.status(200).json({ result: filteredJsonObject })
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

function generateMessages(transcript) {
  return [
    {
      role: 'system',
      content:
        'You are a helpful assistant that finds interesting parts in a chunk of a podcast transcript. You get a part of the transcript as input, and return a list of text snippets that you find intersting and captivating to put in a youtube short. You give the answer directly without introducing it. for example, "Here are the text snippets containing the topic..." is not good. you just list the snippets directly. if the chunk does not contain any discussion that is interesting, you simply respond with an empty string. the transcript is formatted like this "startTime- endTime: text", you ALWAYS keep the formatting so we keep track when the transcript was said.',
    },
    {
      role: 'user',
      content: `Out of this transcript, i want to create youtube shorts. Give me the interesting/captivating parts of the transcript that i can use to create youtube shorts. the transcript is formatted like this "startTime- endTime: text"
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

function generateTimeStamps(text) {
  return [
    {
      role: 'system',
      content:
        'You are a helpful assistant. You only answer in a json format. example: [{ "start": 2564.28, "end": 2577.60 }, { "start": 4264.12, "end": 4291.32 } ]',
    },
    {
      role: 'user',
      content: `I have a list of text snippets, with timestamps in the format "start time - end time". For each section in the discussion, please provide the start time of the first timestamp and the end time of the last timestamp. The text snippets are as follows: ${text} \n
      
      Please provide ONLY the start and end times for each section in the format "start time - end time" IN A JSON array FORMAT like 
      [
        { "start": 2564.28, "end": 2577.60 }]
      also, when two or three snippets are following each other, please combine them into one snippet. for example, if you have the following snippets:
      3.99 - 4.95: ... 
      4.95 - 6.93: ...
      6.93 - 8.58: ...
      you should combine them into one snippet like this:
      { "start": 3.99, "end": 8.58 }}
      even if the snippets are not following each other, but they are less than 10 seconds, please combine them into one snippet. for example, if you have the following snippets:
      { "start": 3.99, "end": 8.58 },
      { "start": 11.47, "end": 15.00},
      would become 
      { "start": 3.99, "end": 15.00 },
      also, if you endup with snippets that are less than 10 seconds, please ignore them. for example, if you have the following snippet:
      { "start": 120.78, "end": 122.19 }, please ignore it.
      `,
    },
  ]
}
