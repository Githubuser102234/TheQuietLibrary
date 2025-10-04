import React from 'react';

// --- 1. Simulated Data (Mocks a Database/API) ---

const items = [
    { id: 101, slug: 'mars-rover-curiosity', name: 'Mars Rover Curiosity', description: 'Exploring Gale Crater since 2012, searching for signs of ancient microbial life.', category: 'Space' },
    { id: 102, slug: 'golden-gate-bridge', name: 'Golden Gate Bridge', description: 'A 1.7-mile long suspension bridge connecting San Francisco Bay and the Pacific Ocean.', category: 'Architecture' },
    { id: 103, slug: 'the-gemini-model', name: 'The Gemini Model', description: 'A powerful family of multimodal large language models developed by Google.', category: 'AI' },
];

// --- 2. Next.js Data Fetching Logic (Runs at Build Time) ---

/**
 * Next.js function to generate the paths for pre-rendering pages.
 * This function handles the dynamic route /item/[slug]
 */
export async function getStaticPaths() {
    // Create the paths array for dynamic pages: /item/mars-rover-curiosity, /item/golden-gate-bridge, etc.
    const paths = items.map(item => ({
        // Note: The parameter name must match the component's expected dynamic segment, 
        // which in this combined file is 'id' since it's simulating the [id].jsx file.
        params: { id: item.slug }, 
    }));

    return {
        paths,
        fallback: false, // Return 404 for paths not found in 'items'
    };
}

/**
 * Next.js function to fetch data for either the Home or Detail page
 */
export async function getStaticProps(context) {
    // Check if context.params exists, which means we are building a DETAIL PAGE (e.g., /item/[slug])
    if (context.params?.id) {
        const slug = context.params.id;
        const item = items.find(i => i.slug === slug);

        if (!item) {
            return { notFound: true };
        }
        
        return { 
            props: { pageType: 'detail', item } 
        };
    }

    // If no context.params, we are building the HOME PAGE (/)
    return { 
        props: { pageType: 'home', items } 
    };
}

// --- 3. React Components (The UI) ---

/**
 * Renders the Detail Page for a specific item (Route: /item/[slug] logic)
 */
const ItemDetailPage = ({ item }) => {
    return (
        <div className="p-6 md:p-12 bg-gray-50 min-h-screen">
            <script src="https://cdn.tailwindcss.com"></script>
            <div className="max-w-3xl mx-auto bg-white shadow-xl rounded-xl p-8 border border-gray-100">
                <a href="/" className="text-indigo-600 hover:text-indigo-800 transition duration-150 flex items-center mb-6 font-medium">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
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


/**
 * Renders the Home Page (Route: /)
 */
const HomePage = ({ items }) => {
    return (
        <div className="p-6 md:p-12 bg-gray-900 min-h-screen">
            <div className="max-w-4xl mx-auto">
                <header className="text-center py-8">
                    <h1 className="text-5xl font-extrabold text-white">
                        Next.js Path-Based Routing Demo
                    </h1>
                    <p className="text-xl text-indigo-300 mt-2">
                        Click an item to see its clean, dynamic URL.
                    </p>
                </header>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-10">
                    {items.map(item => (
                        <div 
                            key={item.id} 
                            className="bg-gray-800 rounded-xl shadow-xl hover:shadow-2xl transition duration-300 transform hover:-translate-y-1 overflow-hidden border border-indigo-700"
                        >
                            {/* Simulation of Next.js Link: navigates to the clean path */}
                            <a href={`/item/${item.slug}`} className="block p-5 h-full">
                                <h2 className="text-2xl font-semibold text-white mb-2 truncate">
                                    {item.name}
                                </h2>
                                <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-gray-700 text-indigo-400 mb-3">
                                    {item.category}
                                </span>
                                <p className="text-gray-400 text-sm line-clamp-3">
                                    {item.description}
                                </p>
                                <p className="mt-4 text-indigo-400 hover:text-indigo-300 text-sm font-bold transition">
                                    View Details &rarr;
                                </p>
                            </a>
                        </div>
                    ))}
                </div>
                
                <footer className="mt-12 text-center text-gray-500 text-sm border-t border-gray-800 pt-6">
                    <p>Routes are generated using the dynamic file path structure: <code className="text-gray-400">pages/item/[id].jsx</code></p>
                </footer>
            </div>
        </div>
    );
};


/**
 * The main component that acts as a router based on the props received from getStaticProps.
 */
const App = (props) => {
    if (props.pageType === 'detail') {
        return <ItemDetailPage item={props.item} />;
    }
    return <HomePage items={props.items} />;
};

export default App;

