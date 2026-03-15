import React from 'react';
import Image from 'next/image';
import { SparklesIcon, ArrowRightIcon } from 'lucide-react';

interface AlertItemProps {
  company: string;
  summary: string;
  link: string;
}

const AlertItem: React.FC<AlertItemProps> = ({ company, summary, link }) => {
  // Extract hostname for favicon URL, fallback if link is invalid
  let hostname = '';
  try {
    const url = new URL(link);
    hostname = url.hostname;
  } catch (e) {
    console.error("Invalid link provided for alert:", link, e);
    hostname = 'default-domain'; // Fallback for invalid URLs
  }

  return (
    <li className="border-b border-white/10 pb-4 last:border-b-0 last:pb-0">
      <div className="flex items-center mb-2">
        <Image
          src={`https://www.google.com/s2/favicons?domain=${hostname}`}
          alt={`${company} favicon`}
          width={20}
          height={20}
          className="mr-2 rounded-sm bg-white p-0.5"
        />
        <span className="font-medium">{company}</span>
      </div>
      <p className="text-sm text-slate-300 mb-2">{summary}</p>
      <a href={link} className="text-xs text-cyan hover:underline flex items-center">
        View Report <ArrowRightIcon className="h-3 w-3 ml-1" />
      </a>
    </li>
  );
};

interface InsightsRailProps {
  alerts: {
    id: string;
    company: string;
    summary: string;
    link: string;
  }[];
}

const InsightsRail: React.FC<InsightsRailProps> = ({ alerts }) => {
  return (
    <aside className="lg:w-1/3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 h-fit lg:h-auto sticky top-6">
      <div className="flex items-center justify-between mb-4">
        <div className="text-2xl font-semibold">Today's Insights</div>
        <SparklesIcon className="h-6 w-6 text-cyan" />
      </div>
      {alerts.length === 0 ? (
        <div className="text-center py-10">
          <SparklesIcon className="mx-auto h-12 w-12 text-slate-700 mb-4" />
          <div className="text-lg font-semibold mb-2">No new intelligence today</div>
        </div>
      ) : (
        <ul className="space-y-4">
          {alerts.map((alert) => (
            <AlertItem
              key={alert.id}
              company={alert.company}
              summary={alert.summary}
              link={alert.link}
            />
          ))}
        </ul>
      )}
    </aside>
  );
};

export default InsightsRail;
