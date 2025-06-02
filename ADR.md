One learning that can be taken from this package is the 'package-as-entrypoint' pattern; the package becomes the entrypoint while using files from the worker itself, and this works fine!

The pattern of Markdown APIs with backend HTML renderer is quite brilliant. Potentially, with `run_worker_first` we can ensure every asset is served through the worker, allowing static assets to be served within the markdown. This is great design as the HTML is meant to help with general navigation and rendering the data in the proper style, nothing else.
