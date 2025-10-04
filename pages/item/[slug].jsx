import React from 'react';

// --- Simulated Data (Mocks a Database/API) ---
const items = [
    { id: 101, slug: 'mars-rover-curiosity', name: 'Mars Rover Curiosity', description: 'Exploring Gale Crater since 2012, searching for signs of ancient microbial life.', category: 'Space' },
    { id: 102, slug: 'golden-gate-bridge', name: 'Golden Gate Bridge', description: 'A 1.7-mile long suspension bridge connecting San Francisco Bay and the Pacific Ocean.', category: 'Architecture' },
    { id: 103, slug: 'the-gemini-model', name: 'The Gemini Model', description: 'A powerful family of multimodal large language models developed by Google.', category: 'AI' },
];


// Next.js function to generate the paths for pre-rendering pages (runs at build time)
export async function getStaticPaths() {
    // Generate paths for every item slug: /item/mars-rover-curiosity, etc.
    const paths = items.map(item => ({
        params: { slug: item.slug },
    }));

    return {
        paths,
        fallback: false, // Return 404 for paths not found
    };
}

// Next.js function to fetch data for the specific page being built (runs at build time)
export async function getStaticProps(context) {
    const slug = context.params.slug;
    const item = items.find(i => i.slug === slug);

    if (!item) {
        return { notFound: true };
    }
    
    return { 
        props: { item } 
    };
}


/**
 * Renders the Detail Page for a specific item (Route: /item/[slug])
 */
const ItemDetailPage = ({ item }) => {
    return (
        <div className="p-6 md:p-12 bg-gray-50 min-h-screen">
            <script src="[https://cdn.tailwindcss.com](https://cdn.tailwindcss.com)"></script>
            <div className="max-w-3xl mx-auto bg-white shadow-xl rounded-xl p-8 border border-gray-100">
                <a href="/" className="text-indigo-600 hover:text-indigo-800 transition duration-150 flex items-center mb-6 font-medium">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                    Back to All Items
                </a>
                
                <h1 className="text-4xl font-extrabold text-gray-900 border-b pb-4 mb-4">
                    {item.name}
                </h1>
                <span className="inline-block px-3 py-1 text-sm font-semibold rounded-full bg-indigo-100 text-indigo-700 mb-6">
                    {item.category}
                </span>

                <p className="text-gray-700 text-lg leading-relaxed mb-8">
                    {item.description}
                </p>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-500 font-mono">
                        Clean URL Path: <code className="text-gray-800 font-bold">/item/{item.slug}</code>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ItemDetailPage;

Final Steps to Deploy
 * Delete/Rename Old Files: Ensure you delete any old versions of the code you were using (like the complex combined pages/index.jsx or any pages/post/[slug].jsx from previous attempts).
 * Create Folders: Make sure your file structure looks exactly like this:
   / (Root Directory)
├── package.json
├── pages/
│   ├── index.jsx          <-- Content from File 1
│   └── item/
│       └── [slug].jsx     <-- Content from File 2



