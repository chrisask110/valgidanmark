# Valg i Danmark

[![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000?style=flat&logo=vercel&logoColor=white)](https://vercel.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

Valg i Danmark is an open-source website dedicated to providing in-depth analysis and visualizations of Danish election polls, modeled after the renowned FiveThirtyEight (538) approach used in American elections. Our goal is to offer transparent, data-driven insights into the upcoming Danish parliamentary election on March 24, 2026.

The site aggregates polling data, applies statistical modeling to forecast outcomes, and presents results through interactive dashboards and charts. By drawing inspiration from 538's methodology—such as poll averaging, trend adjustments, and uncertainty modeling—we aim to create a reliable resource for voters, journalists, and analysts.

Live site: [valgidanmark.dk](https://valgidanmark.dk)

## Features

- **Poll Aggregation**: Collects and displays the latest polls from various sources.
- **Forecast Modeling**: Uses statistical methods similar to 538 to simulate election outcomes, including mandate calculations and probability estimates.
- **Interactive Dashboard**: Visualizes party standings, leader images, and trends with Recharts and shadcn/ui components.
- **Daily Updates**: Automated via GitHub Actions and Vercel cron jobs to fetch and process new data.
- **Responsive Design**: Built with Tailwind CSS for a modern, mobile-friendly interface.

## Tech Stack

- **Framework**: Next.js (React-based for server-side rendering and API routes)
- **Styling**: Tailwind CSS with shadcn/ui for reusable components
- **Charts & Visuals**: Recharts for data visualization
- **Deployment**: Vercel with GitHub Actions for CI/CD
- **Languages**: TypeScript (primary), JavaScript
- **Other Tools**: PostCSS, middleware for API handling, and utilities in `lib/` for data processing

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- npm or yarn

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/chrisask110/valgidanmark.git
   cd valgidanmark
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Run the development server:
   ```
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

4. Build for production:
   ```
   npm run build
   npm run start
   ```

## Project Structure

- `app/`: Core pages and routing (e.g., dashboard with mandate logic)
- `components/ui/`: Reusable UI elements (buttons, charts, etc.)
- `lib/`: Utility functions for data modeling and processing
- `public/Leaders/`: Images of party leaders
- `.github/workflows/`: Automation scripts for deployment and data updates
- Configuration files: `next.config.js`, `tailwind.config.ts`, `tsconfig.json`, etc.

## Contributing

We welcome contributions to make Valg i Danmark even better! Whether you're suggesting smarter ways to handle data (e.g., advanced Bayesian modeling beyond 538's basics), improving UI/UX, adding features like regional breakdowns, or fixing bugs—this project thrives on community input.

### Ideas to Improve
Inspired by 538, here are some areas for enhancement:
- **Smarter Modeling**: Integrate machine learning for bias adjustment or incorporate economic indicators for more accurate forecasts.
- **Data Sources**: Expand poll aggregation to include more Danish outlets or real-time APIs.
- **Visuals**: Add interactive maps or scenario simulators.
- **Accessibility**: Ensure WCAG compliance for broader reach.
- **Multilingual Support**: Add English translations for international audiences.

If you have ideas, open an issue with the label "idea" to discuss!

### How to Contribute
1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/YourIdea`.
3. Commit your changes: `git commit -m 'Add some feature'`.
4. Push to the branch: `git push origin feature/YourIdea`.
5. Open a Pull Request.

Please follow our [Code of Conduct](CODE_OF_CONDUCT.md) (coming soon) and ensure your code is well-tested.

## Legal Considerations

As an election-related site in Denmark:
- **Data Accuracy**: Polls and models are for informational purposes only. We strive for transparency but cannot guarantee outcomes. Always cite sources and disclose methodologies.
- **Impartiality**: Avoid partisan bias; contributions should maintain neutrality.
- **Privacy**: No user data is collected, but if adding features, comply with GDPR.
- **Copyright**: Leader images and data should be public domain or properly licensed. Check Danish election laws (e.g., via Valgstyrelsen) for restrictions on publishing polls near election day.
- **Disclaimer**: This is not an official site. Consult legal experts for compliance with Danish media and election regulations.

If you're aware of any legal pitfalls or smarter ways to handle them, please contribute!

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Inspired by [FiveThirtyEight](https://fivethirtyeight.com/)
- Built with open-source tools like Next.js and Tailwind CSS
- Thanks to contributors for ideas and code!

To make your site smarter, inspired by 538's approach to U.S. elections, consider these enhancements based on their emphasis on rigorous, transparent forecasting:

- **Advanced Poll Weighting and Adjustments**: Your current setup uses weighted averages from institutes like Verian, Epinion, Megafon, and Voxmeter, which is solid. To go further, implement house effects adjustments (bias corrections for each pollster based on historical accuracy) and trendline smoothing using techniques like LOESS regression. This could refine your national averages and mandate projections, similar to how 538 adjusts for pollster ratings (e.g., your A/B+ grades for institutes are a great start—quantify them more with past deviation metrics).

- **Expanded Simulations**: Your Monte Carlo simulations for bloc majorities (e.g., 32% for Rød Blok) are excellent. Smarter: Run 10,000+ simulations incorporating correlated uncertainties across parties (e.g., if Social Democrats gain, it might correlate with losses for other left parties). Add fundamentals like economic indicators (unemployment, GDP growth) or incumbency effects to baseline models, reducing reliance on polls alone—538 does this to handle early-cycle volatility.

- **Interactive Tools**: Build on your statsminister-simulator by adding a "what-if" scenario builder where users adjust poll numbers and see real-time mandate shifts or majority probabilities. Include visualizations like win probability charts over time or density plots for mandate distributions, making it more engaging like 538's interactive forecast maps.

- **Regional and Demographic Breakdowns**: Currently focused on national levels, add breakdowns by multi-member constituencies (e.g., using local polls if available) or demographics (age, region via crosstabs). This could highlight paths to majority, such as Rød Blok's edge in urban areas.

- **Prediction Market Integration**: You already link to Polymarket—smarter: Blend market odds (e.g., next PM probabilities) with your model using Bayesian updating for hybrid forecasts, providing a robustness check against poll volatility.

- **Uncertainty Visualization**: Enhance charts with error bars or confidence intervals on party support trends, and use fan charts for forecasts to communicate uncertainty clearly, avoiding overconfidence in close races like the current ~88 vs. ~81 mandates for blocs.

On legal aspects for publishing polls in Denmark, note that unlike some countries, there's no blackout period—polls can be published right up to election day. However, ensure all content complies with the Media Liability Act, which requires sound press ethics and holds publishers accountable for libel or misleading info. Disclose methodologies transparently (e.g., weighting, sample sizes) to maintain impartiality. Political ads are banned on national TV/radio but allowed on commercial radio and online—your site isn't advertising, but if expanding to endorsements, stay neutral. No campaign spending limits apply to sites like yours, but if monetizing, track anonymous donations over DKK 20,000 for transparency. Always add disclaimers that forecasts are not official and consult Valgstyrelsen for any election-day restrictions.
