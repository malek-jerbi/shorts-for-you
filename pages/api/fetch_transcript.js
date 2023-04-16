import { getSubtitles } from 'youtube-captions-scraper'

export default async function (req, res) {
  const videoId = 'GvX-heRWFfA'

  try {
    const subtitles = await getSubtitles({ videoID: videoId })
    const transcriptText = subtitles
      .map((entry, index, arr) => {
        const start = parseFloat(entry.start).toFixed(2)
        let end
        if (index < arr.length - 1) {
          end = parseFloat(arr[index + 1].start).toFixed(2)
        } else {
          end = 'unknown'
        }
        return `${start} - ${end}: ${entry.text}`
      })
      .join(' ')

    res.status(200).json({ transcript: transcriptText })
  } catch (error) {
    console.error(`Error fetching transcript: ${error.message}`)
    res.status(500).json({
      error: {
        message: 'An error occurred while fetching the transcript.',
      },
    })
  }
}
