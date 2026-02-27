
import fetch from 'node-fetch'

async function testImageProxy() {
  const id = 'a143db5b-45bc-4fa6-96b2-c925acca759b' // Use a known ID from logs
  const url = `https://docs-smax.netlify.app/api/outline/image?id=${id}`
  
  console.log(`Fetching ${url}...`)
  const res = await fetch(url)
  console.log(`Status: ${res.status}`)
  console.log(`Content-Type: ${res.headers.get('content-type')}`)
  console.log(`Content-Length: ${res.headers.get('content-length')}`)
}

testImageProxy()
