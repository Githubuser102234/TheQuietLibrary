import React from 'react';
// Next.js specific functions for static generation/server-side rendering
// These functions are critical for creating path-based routes like /post/my-post-title
// NOTE: We are simulating data as we cannot make a real async call outside of the runtime.

/**
 * Next.js function to generate the paths for pre-rendering pages.
 * This is used for Static Site Generation (SSG) in production builds.
 * Next.js will call this function during 'next build' to determine which paths to build.
 * @returns {{paths: Array<{params: {slug: string}}>, fallback: boolean}}
 */
export async function getStaticPaths() {
    // 1. Simulate fetching a list of post slugs from a database or API
    const postSlugs = [
        "nextjs-routing-guide",
        "vercel-deployment-tips",
        "react-hooks-deep-dive"
    ];

    // 2. Map slugs to the format required by Next.js
    const paths = postSlugs.map((slug) => ({
        params: { slug },
    }));

    // 'fallback: false' means any path not returned by getStaticPaths will result in a 404.
    // Use 'fallback: true' to lazily load new pages (ISR).
    return {
        paths,
        fallback: false
    };
}

/**
 * Next.js function to fetch data for the specific path determined by getStaticPaths.
 * This function runs during the build process to pre-render the content.
 * @param {{params: {slug: string}}} context - Contains the dynamic slug from the URL path.
 * @returns {{props: {post: {title: string, content: string, slug: string}}}}
 */
export async function getStaticProps(context) {
    const { slug } = context.params;

    // 1. Simulate fetching post data based on the 'slug'
    let postData = {
        title: "Default Post Title",
        content: "This is fallback content. The specific post data wasn't found in the simulated database.",
        slug: slug
    };

    if (slug === "nextjs-routing-guide") {
        postData = {
            title: "Understanding Next.js Path-Based Routing",
            content: "Next.js uses file names and folders to automatically handle routing. By creating a file named `[slug].jsx` inside a `post` folder, we can capture dynamic segments, resulting in clean URLs like '/post/article-name'. This is the standard, SEO-friendly way to route pages.",
            slug: slug
        };
    } else if (slug === "vercel-deployment-tips") {
        postData = {
            title: "Top 3 Tips for Vercel Deployment",
            content: "1. Use Environment Variables for secrets. 2. Understand Instant Previews (branch deployments). 3. Always check your Build Logs!",
            slug: slug
        };
    } else if (slug === "react-hooks-deep-dive") {
        postData = {
            title: "A Deep Dive into the useEffect Hook",
            content: "The `useEffect` hook allows you to perform side effects in functional components. Properly managing the dependency array is crucial for performance and preventing infinite loops. Remember to return a cleanup function!",
            slug: slug
        };
    }

    // 2. Return the post data as props to the component
    return {
        props: {
            post: postData,
        },
    };
}


// --- React Component (The UI) ---

/**
 * The main component that receives the pre-fetched post data as props.
 */
const PostDetail = ({ post }) => {
    
    // Fallback for demonstration if the dynamic path isn't built (e.g., in development)
    if (!post) {
        return <div className="min-h-screen bg-gray-900 flex justify-center items-center p-6"><p className="text-white text-lg">Loading or post not found...</p></div>;
    }

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 p-8 md:p-12">
            <script src="https://cdn.tailwindcss.com"></script>
            <div className="max-w-4xl mx-auto">

                {/* Breadcrumb / Link back to home */}
                <a 
                    href="/" 
                    className="inline-flex items-center text-indigo-400 hover:text-indigo-300 transition-colors mb-8 text-sm font-medium"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to Posts List
                </a>

                {/* Article Header */}
                <header className="pb-6 border-b border-indigo-700 mb-8">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight">
                        {post.title}
                    </h1>
                    <p className="mt-2 text-indigo-400 font-mono text-sm">
                        URL Slug: <span className="text-gray-300">/post/{post.slug}</span>
                    </p>
                </header>

                {/* Article Content */}
                <article className="prose prose-invert max-w-none text-lg leading-relaxed space-y-6">
                    <p className="text-gray-300">
                        {post.content}
                    </p>
                    
                    <div className="pt-6 border-t border-gray-700 mt-10">
                        <p className="font-semibold text-lg text-indigo-300">
                            How This Works (For Next.js):
                        </p>
                        <ul className="list-disc list-inside ml-4 text-sm text-gray-400 space-y-1">
                            <li>The file name <code>[slug].jsx</code> tells Next.js to treat everything after <code>/post/</code> as a dynamic parameter called <code>slug</code>.</li>
                            <li>The <code>getStaticPaths</code> function determines all the possible URLs (like `/post/nextjs-routing-guide`) at build time.</li>
                            <li>The <code>getStaticProps</code> function fetches the data for each specific slug and passes it to this component.</li>
                        </ul>
                    </div>
                </article>

            </div>
        </div>
    );
};

export default PostDetail;

