
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const host = request.headers.get('host')

  // This is a placeholder for the backend API URL.
  // In a real-world scenario, this should be a secret.
  const backendApiUrl = 'https://backend.example.com/api/store/by-domain/'

  try {
    const response = await fetch(`${backendApiUrl}?domain=${host}`)
    if (!response.ok) {
      // If the domain is not found or there is a backend error, return a 404.
      return new Response('Not Found', { status: 404 })
    }

    const data = await response.json()
    const subdomainUrl = data.subdomainUrl

    if (!subdomainUrl) {
      return new Response('Not Found', { status: 404 })
    }

    // Rewrite the request to the subdomain URL.
    const url = new URL(request.url)
    url.hostname = new URL(subdomainUrl).hostname

    const newRequest = new Request(url, request)

    return fetch(newRequest)
  } catch (error) {
    // If there is an error fetching from the backend, return a 500.
    return new Response('Internal Server Error', { status: 500 })
  }
}
