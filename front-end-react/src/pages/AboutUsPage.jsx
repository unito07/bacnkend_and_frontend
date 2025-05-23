import React from 'react';
import { Github } from 'lucide-react'; // Assuming lucide-react is installed for icons

function AboutUsPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <header className="text-center mb-12">
        <h1 className="text-5xl font-bold">About Our Web Scraper</h1>
        <p className="text-xl text-slate-300 mt-2">Discover the story behind the tool.</p>
      </header>

      <section className="max-w-3xl mx-auto mb-12 bg-slate-800 p-8 rounded-lg shadow-xl">
        <h2 className="text-3xl font-semibold mb-4 text-sky-400">Why We Built This</h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          In an age of information, accessing and utilizing web data efficiently is paramount. We noticed many existing tools were either too complex for simple tasks, too limited for dynamic content, or too expensive for individuals and small teams.
        </p>
        <p className="text-slate-300 leading-relaxed">
          Our mission was to create a web scraper that is powerful yet intuitive, capable of handling both static and JavaScript-heavy dynamic websites. We aimed for a tool that empowers users to gather the data they need without a steep learning curve or a hefty price tag. This project is born out of a passion for open data and accessible technology.
        </p>
      </section>

      <section className="max-w-3xl mx-auto mb-12 bg-slate-800 p-8 rounded-lg shadow-xl">
        <h2 className="text-3xl font-semibold mb-4 text-sky-400">Our Team (Placeholder)</h2>
        <p className="text-slate-300 leading-relaxed">
          We are a dedicated group of developers and data enthusiasts committed to building useful and accessible tools. (More detailed team information coming soon!)
        </p>
        {/* Placeholder for team member cards or list */}
      </section>

      <section className="max-w-3xl mx-auto mb-12 text-center bg-slate-800 p-8 rounded-lg shadow-xl">
        <h2 className="text-3xl font-semibold mb-4 text-sky-400">Project Repository</h2>
        <a
          href="https://github.com/your-username/your-repo-name" // Replace with actual GitHub link
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-sky-600 hover:bg-sky-700"
        >
          <Github className="mr-2 h-5 w-5" />
          View on GitHub
        </a>
      </section>

      <section className="max-w-3xl mx-auto bg-slate-800 p-8 rounded-lg shadow-xl">
        <h2 className="text-3xl font-semibold mb-4 text-sky-400">Contact Us (Placeholder)</h2>
        <p className="text-slate-300 leading-relaxed">
          Have questions, feedback, or want to contribute? We'd love to hear from you. (Contact form or email address coming soon!)
        </p>
      </section>
    </div>
  );
}

export default AboutUsPage;
