import React from 'react';

// --- IMPORTANT FIX: Use Next.js Link for client-side routing ---
import Link from 'next/link'; 

// --- Simulated Data (Mocks a Database/API) ---
const items = [
    { id: 101, slug: 'mars-rover-curiosity', name: 'Mars Rover Curiosity', description: 'Exploring Gale Crater since 2012, searching for signs of ancient microbial life.', category: 'Space' },
    { id: 102, slug: 'golden-gate-bridge', name: 'Golden Gate Bridge', description: 'A 1.7-mile long suspension bridge connecting San Francisco Bay and the Pacific Ocean.', category: 'Architecture' },
    { id: 103, slug: 'the-gemini-model', name: 'The Gemini Model', description: 'A powerful family of multimodal large language models developed by Google.', category: 'AI' },
];

// Next.js function to fetch the list of items for the homepage at build time
export async function getStaticProps() {
    return { 
        props: { items } 
    };
}

/**
 * Renders the Home Page (Route: /)
 */
const HomePage = ({ items }) => {
    return (
        <div className="p-6 md:p-12 bg-gray-900 min-h-screen">
            <script src="https://cdn.tailwindcss.com"></script>
            <div className="max-w-4xl mx-auto">
                <header className="text-center py-8">
                    <h1 className="text-5xl font-extrabold text-white">
                        Next.js Dynamic Routing Test
                    </h1>
                    <p className="text-xl text-indigo-300 mt-2">
                        Click an item to see its clean path-based URL.
                    </p>
                </header>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-10">
                    {items.map(item => (
                        <div 
                            key={item.id} 
                            className="bg-gray-800 rounded-xl shadow-xl hover:shadow-2xl transition duration-300 transform hover:-translate-y-1 overflow-hidden border border-indigo-700"
                        >
                            {/* FIX: Use <Link> instead of <a> */}
                            <Link href={`/item/${item.slug}`} passHref legacyBehavior>
                                <a className="block p-5 h-full">
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
                            </Link>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default HomePage;

