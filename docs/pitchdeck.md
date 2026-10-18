\documentclass[aspectratio=169,11pt]{beamer}

\usepackage[utf8]{inputenc}
\usepackage{xcolor}
\usepackage{setspace}
\usepackage{tabularx}
\usepackage{tikz}
\usetikzlibrary{positioning}
\usepackage{pgfplots}
\pgfplotsset{compat=1.18}

% --- Typography ---
\usepackage[scaled=0.92]{helvet}
\renewcommand{\familydefault}{\sfdefault}

% --- Brand Palette ---
\definecolor{SolidBlack}{HTML}{000000}
\definecolor{PureWhite}{HTML}{FFFFFF}
\definecolor{LinkBlue}{HTML}{0066CC}
\definecolor{CorporateNavy}{HTML}{0A192F}
\definecolor{DeepCharcoal}{HTML}{2D3748}
\definecolor{RuleNavy}{HTML}{1E293B}

\setbeamercolor{background canvas}{bg=PureWhite}
\setbeamercolor{normal text}{fg=DeepCharcoal}
\setbeamertemplate{navigation symbols}{}

\begin{document}

% ==========================================
% SLIDE 1: COVER
% ==========================================
\begin{frame}
\vfill
\begin{tabularx}{\textwidth}{@{} X >{\raggedleft\arraybackslash}X @{}}
    {\fontsize{42}{48}\sffamily\bfseries\color{CorporateNavy} Muncheez\color{LinkBlue}{\textbf{.}}} &
    \textsf{\small\bfseries\color{CorporateNavy} INVESTOR PRESENTATION} \\
    {\textsf{\scriptsize\bfseries\color{DeepCharcoal} THE NEIGHBORHOOD OPERATING SYSTEM}} &
    \textsf{\scriptsize\color{LinkBlue}\bfseries PRE-SEED ROUND // 2026} \\
\end{tabularx}

\vspace{0.4cm}
\begin{tikzpicture}
    \draw[line width=2.5pt, color=CorporateNavy] (0,0) -- (\textwidth-3cm, 0);
    \draw[line width=2.5pt, color=LinkBlue] (\textwidth-3cm,0) -- (\textwidth, 0);
\end{tikzpicture}

\vspace{1.2cm}
{\fontsize{24}{30}\sffamily\bfseries\color{CorporateNavy}
Convenience without compromise. Access without friction.}

\vspace{0.4cm}
\textsf{\small\color{DeepCharcoal}
Starting in Thika Greens \textperiodcentered\ Ngoingwa \textperiodcentered\ Juja}

\vfill
\textsf{\tiny\bfseries\color{DeepCharcoal}
CONFIDENTIAL // FOR QUALIFIED INVESTORS ONLY}
\end{frame}


% ==========================================
% SLIDE 2: THE THESIS
% ==========================================
\begin{frame}
\textsf{\scriptsize\bfseries\color{LinkBlue}\uppercase{01 / The Thesis}}
\vspace{0.2cm}

{\fontsize{22}{28}\sffamily\bfseries\color{CorporateNavy}
The Access Problem}

\vspace{0.8cm}
\begin{tabularx}{\textwidth}{@{} X @{}}
    \textsf{\small
    \textperiodcentered\ Local businesses serve real neighborhood demand, but many remain difficult to discover and access.} \\[0.2cm]
    \textsf{\small
    \textperiodcentered\ Discovery, ordering, payment, and delivery often operate separately.} \\[0.2cm]
    \textsf{\small
    \textperiodcentered\ Muncheez connects the journey: Discover $\rightarrow$ Order $\rightarrow$ Pay $\rightarrow$ Fulfil $\rightarrow$ Deliver.} \\[0.2cm]
    \textsf{\small
    \textperiodcentered\ We start with food and build toward broader neighborhood commerce.}
\end{tabularx}
\end{frame}


% ==========================================
% SLIDE 3: THE GAP
% ==========================================
\begin{frame}
\textsf{\scriptsize\bfseries\color{LinkBlue}\uppercase{02 / The Gap}}
\vspace{0.2cm}

{\fontsize{22}{28}\sffamily\bfseries\color{CorporateNavy}
Marketplaces vs. Neighborhood Infrastructure}

\vspace{0.8cm}
\begin{tabularx}{\textwidth}{@{} X X @{}}
    \textsf{\small\bfseries\color{CorporateNavy} Broad Marketplaces} &
    \textsf{\small\bfseries\color{CorporateNavy} Muncheez} \\[0.15cm]

    \textsf{\small More listings} &
    \textsf{\small Curated local choices} \\[0.15cm]

    \textsf{\small Visibility driven by promotion} &
    \textsf{\small Discovery informed by performance} \\[0.15cm]

    \textsf{\small Broad geographic coverage} &
    \textsf{\small Focused neighborhood density} \\[0.15cm]

    \textsf{\small Generalized operations} &
    \textsf{\small Local fulfilment}
\end{tabularx}

\vspace{0.5cm}
\textsf{\small
We aim to win with 50--150 relevant merchants per neighborhood before expanding further.}
\end{frame}


% ==========================================
% SLIDE 4: OUR ADVANTAGE
% ==========================================
\begin{frame}
\textsf{\scriptsize\bfseries\color{LinkBlue}\uppercase{03 / Our Advantage}}
\vspace{0.2cm}

{\fontsize{22}{28}\sffamily\bfseries\color{CorporateNavy}
Built for Neighborhood Density}

\vspace{0.8cm}
\begin{tabularx}{\textwidth}{@{} X @{}}
    \textsf{\small
    \textbf{Curated supply} -- Prioritize quality, consistency, and repeat demand.} \\[0.25cm]

    \textsf{\small
    \textbf{Local logistics} -- Match deliveries to neighborhood conditions, merchant readiness, and rider availability.} \\[0.25cm]

    \textsf{\small
    \textbf{Merchant-first economics} -- Target commissions of 12--15\%, with transparent payouts.} \\[0.25cm]

    \textsf{\small
    \textbf{Community trust} -- Build dependable service through strong local relationships.}
\end{tabularx}

\vspace{0.4cm}
\textsf{\small
Our advantage comes from understanding and serving each neighborhood well.}
\end{frame}


% ==========================================
% SLIDE 5: CONVENIENCE + ACCESS
% ==========================================
\begin{frame}
\textsf{\scriptsize\bfseries\color{LinkBlue}\uppercase{04 / Convenience + Access}}
\vspace{0.2cm}

{\fontsize{22}{28}\sffamily\bfseries\color{CorporateNavy}
One Ecosystem for All}

\vspace{0.8cm}
\begin{tabularx}{\textwidth}{@{} X X X @{}}
    \textsf{\small\bfseries\color{CorporateNavy} Customers} &
    \textsf{\small\bfseries\color{CorporateNavy} Merchants} &
    \textsf{\small\bfseries\color{CorporateNavy} Riders} \\[0.2cm]

    \textsf{\small Discover, order, pay, and track} &
    \textsf{\small Manage products, fulfil orders, and get paid} &
    \textsf{\small Receive delivery requests and earn}
\end{tabularx}

\vspace{0.5cm}
\textsf{\small
Three connected experiences. One coordinated platform.}
\end{frame}


% ==========================================
% SLIDE 6: THE ECOSYSTEM
% ==========================================
\begin{frame}
\textsf{\scriptsize\bfseries\color{LinkBlue}\uppercase{05 / The Ecosystem}}
\vspace{0.2cm}

{\fontsize{22}{28}\sffamily\bfseries\color{CorporateNavy}
Three-Sided Network}

\vspace{0.8cm}
\begin{tabularx}{\textwidth}{@{} X X X @{}}
    \textsf{\small\bfseries\color{CorporateNavy} Customers} &
    \textsf{\small\bfseries\color{CorporateNavy} Merchants} &
    \textsf{\small\bfseries\color{CorporateNavy} Riders} \\[0.2cm]

    \textsf{\small Discover} &
    \textsf{\small List} &
    \textsf{\small Get matched} \\[0.2cm]

    \textsf{\small Order} &
    \textsf{\small Sell} &
    \textsf{\small Pick up} \\[0.2cm]

    \textsf{\small Pay} &
    \textsf{\small Manage} &
    \textsf{\small Deliver} \\[0.2cm]

    \textsf{\small Track} &
    \textsf{\small Fulfil} &
    \textsf{\small Earn} \\[0.2cm]

    \textsf{\small Receive} &
    \textsf{\small Get paid} &
\end{tabularx}

\vspace{0.5cm}
\textsf{\small
Muncheez coordinates the order from discovery to delivery.}
\end{frame}


% ==========================================
% SLIDE 7: DENSITY FIRST
% ==========================================
\begin{frame}
\textsf{\scriptsize\bfseries\color{LinkBlue}\uppercase{06 / Density First}}
\vspace{0.2cm}

{\fontsize{22}{28}\sffamily\bfseries\color{CorporateNavy}
Win Neighborhoods, Not Cities}

\vspace{0.8cm}
\begin{tabularx}{\textwidth}{@{} X @{}}
    \textsf{\small
    \textperiodcentered\ Begin in Thika Greens, Ngoingwa, and Juja.} \\[0.25cm]

    \textsf{\small
    \textperiodcentered\ Juja provides access to a large student and residential market.} \\[0.25cm]

    \textsf{\small
    \textperiodcentered\ Thika provides an established commercial and residential base.} \\[0.25cm]

    \textsf{\small
    \textperiodcentered\ Prove the model in three neighborhoods before entering new towns.}
\end{tabularx}
\end{frame}


% ==========================================
% SLIDE 8: CURATED MERCHANTS
% ==========================================
\begin{frame}
\textsf{\scriptsize\bfseries\color{LinkBlue}\uppercase{07 / Curated Network}}
\vspace{0.2cm}

{\fontsize{22}{28}\sffamily\bfseries\color{CorporateNavy}
Onboard the Best, Not the Most}

\vspace{0.8cm}
\begin{tabularx}{\textwidth}{@{} X X X @{}}
    \textsf{\small\bfseries Restaurants} &
    \textsf{\small\bfseries Home Kitchens} &
    \textsf{\small\bfseries Bakers} \\[0.2cm]

    \textsf{\small Kuku choma} &
    \textsf{\small Swahili food} &
    \textsf{\small Sourdough} \\[0.2cm]

    \textsf{\small Nyama choma} &
    \textsf{\small Healthy meals} &
    \textsf{\small Pastries} \\[0.2cm]

    \textsf{\small African cuisine} &
    \textsf{\small Desserts} &
    \textsf{\small Cakes} \\[0.2cm]

    \textsf{\small Cafés} &
    \textsf{\small Student meals} &
    \textsf{\small Local favourites}
\end{tabularx}

\vspace{0.5cm}
\textsf{\small
Build a network around products people want and order again.}
\end{frame}


% ==========================================
% SLIDE 9: THE CURATION ENGINE
% ==========================================
\begin{frame}
\textsf{\scriptsize\bfseries\color{LinkBlue}\uppercase{08 / The Curation Engine}}
\vspace{0.2cm}

{\fontsize{22}{28}\sffamily\bfseries\color{CorporateNavy}
Measure What Reorders}

\vspace{0.8cm}
\begin{tabularx}{\textwidth}{@{} X X @{}}
    \textsf{\small\bfseries\color{CorporateNavy} Product Quality} &
    \textsf{\small Taste, consistency, portion, presentation} \\[0.25cm]

    \textsf{\small\bfseries\color{CorporateNavy} Operations} &
    \textsf{\small Preparation time, accuracy, packaging} \\[0.25cm]

    \textsf{\small\bfseries\color{CorporateNavy} Customer Experience} &
    \textsf{\small Ratings, repeat orders, refunds} \\[0.25cm]

    \textsf{\small\bfseries\color{CorporateNavy} Commercial Performance} &
    \textsf{\small Order value, conversion, demand}
\end{tabularx}

\vspace{0.5cm}
\textsf{\small
Customer feedback matters. Repeat purchases show what works.}
\end{frame}


% ==========================================
% SLIDE 10: LOGISTICS CHALLENGE
% ==========================================
\begin{frame}
\textsf{\scriptsize\bfseries\color{LinkBlue}\uppercase{09 / The Logistics Challenge}}
\vspace{0.2cm}

{\fontsize{22}{28}\sffamily\bfseries\color{CorporateNavy}
Neighborhood Delivery Is Complex}

\vspace{0.8cm}
\begin{tabularx}{\textwidth}{@{} X @{}}
    \textsf{\small \textperiodcentered\ Unpredictable merchant preparation times} \\[0.18cm]
    \textsf{\small \textperiodcentered\ Rider distance and availability} \\[0.18cm]
    \textsf{\small \textperiodcentered\ Traffic and road access} \\[0.18cm]
    \textsf{\small \textperiodcentered\ Inconsistent addresses and directions} \\[0.18cm]
    \textsf{\small \textperiodcentered\ Customer availability at delivery} \\[0.18cm]
    \textsf{\small \textperiodcentered\ Orders ready at different times}
\end{tabularx}

\vspace{0.3cm}
\textsf{\small
Efficient delivery requires coordination, not distance calculations alone.}
\end{frame}


% ==========================================
% SLIDE 11: LOGISTICS ENGINE
% ==========================================
\begin{frame}
\textsf{\scriptsize\bfseries\color{LinkBlue}\uppercase{10 / Our Logistics Engine}}
\vspace{0.2cm}

{\fontsize{22}{28}\sffamily\bfseries\color{CorporateNavy}
Zone, Predict, Dispatch}

\vspace{0.8cm}
\begin{enumerate}
    \item \textbf{Zone:} Organize operations around neighborhood service areas.
    \vspace{0.15cm}
    \item \textbf{Predict:} Estimate preparation times from merchant performance.
    \vspace{0.15cm}
    \item \textbf{Score:} Evaluate distance, readiness, workload, traffic, and reliability.
    \vspace{0.15cm}
    \item \textbf{Batch:} Combine compatible orders when timing and routes allow.
\end{enumerate}

\vspace{0.3cm}
\textsf{\small
Objective: improve successful deliveries, reliability, and cost per order.}
\end{frame}


% ==========================================
% SLIDE 12: DENSITY ECONOMICS
% CLEAN THREE-COLUMN LAYOUT
% ==========================================
\begin{frame}
\textsf{\scriptsize\bfseries\color{LinkBlue}\uppercase{11 / Density Economics}}
\vspace{0.2cm}

{\fontsize{22}{28}\sffamily\bfseries\color{CorporateNavy}
Density Drives Performance}

\vspace{1.2cm}

\begin{tabularx}{\textwidth}{@{} X X X @{}}
    \textsf{\small\bfseries\color{LinkBlue} LOWER COSTS} &
    \textsf{\small\bfseries\color{LinkBlue} FASTER DELIVERY} &
    \textsf{\small\bfseries\color{LinkBlue} MORE ORDERS} \\[0.4cm]

    \textsf{\small More orders within shorter distances.} &
    \textsf{\small Less travel between merchants and customers.} &
    \textsf{\small More deliveries from the same local network.}
\end{tabularx}

\vspace{1.4cm}

\begin{tikzpicture}
    \draw[line width=2pt,color=CorporateNavy] (0,0) -- (0.72\textwidth,0);
    \draw[line width=2pt,color=LinkBlue] (0.72\textwidth,0) -- (\textwidth,0);
\end{tikzpicture}

\vspace{0.5cm}
\textsf{\small\bfseries\color{CorporateNavy}
Our strategy: build density first, then expand.}

\end{frame}


% ==========================================
% SLIDE 12: DATA FLYWHEEL
% ==========================================
\begin{frame}
\textsf{\scriptsize\bfseries\color{LinkBlue}\uppercase{12 / The Data Flywheel}}
\vspace{0.2cm}

{\fontsize{22}{28}\sffamily\bfseries\color{CorporateNavy}
Every Order Makes Us Smarter}

\vspace{1.0cm}
\centering

{\fontsize{18}{24}\sffamily\bfseries\color{LinkBlue}
\textperiodcentered\ Order \textrightarrow\ Merchant Data \textrightarrow\ Rider Data \textrightarrow\ Customer Data}

\vspace{0.8cm}

{\fontsize{16}{22}\sffamily\color{CorporateNavy}
\textperiodcentered\ Better Ranking $\cdot$ Smarter Dispatch $\cdot$ Accurate ETA}

\vspace{0.8cm}

{\fontsize{20}{26}\sffamily\bfseries\color{LinkBlue}
\textperiodcentered\ More Repeat Orders $\rightarrow$ Greater Density $\rightarrow$ Faster Flywheel}

\vspace{1.0cm}

{\fontsize{14}{20}\sffamily\color{DeepCharcoal}
\textperiodcentered\ The more orders we process, the better every subsequent order becomes.}
\end{frame}


% ==========================================
% SLIDE 14: TECHNOLOGY ROADMAP
% SIMPLIFIED, RESTRUCTURED
% ==========================================
\begin{frame}
\textsf{\scriptsize\bfseries\color{LinkBlue}\uppercase{13 / Technology Roadmap}}
\vspace{0.2cm}

{\fontsize{22}{28}\sffamily\bfseries\color{CorporateNavy}
Build. Prove. Optimise.}

\vspace{0.7cm}
\begin{tabularx}{\textwidth}{@{} p{2.7cm} X @{}}

    \textsf{\small\bfseries\color{LinkBlue} PHASE 1} &
    \textsf{\small\bfseries\color{CorporateNavy} Core Platform} \\[-0.05cm]
    &
    \textsf{\small
    Complete the transaction engine, merchant tools, rider workflows, and M-PESA integration.} \\[0.4cm]

    \textsf{\small\bfseries\color{LinkBlue} PHASE 2} &
    \textsf{\small\bfseries\color{CorporateNavy} Reliable Operations} \\[-0.05cm]
    &
    \textsf{\small
    Improve dispatch, delivery estimates, order batching, and merchant performance reporting.} \\[0.4cm]

    \textsf{\small\bfseries\color{LinkBlue} PHASE 3} &
    \textsf{\small\bfseries\color{CorporateNavy} Intelligent Growth} \\[-0.05cm]
    &
    \textsf{\small
    Introduce personalised discovery, demand forecasting, and neighbourhood growth tools.}

\end{tabularx}

\vspace{0.5cm}
\textsf{\small
The pre-seed round supports platform readiness, operational validation, and early scale.}
\end{frame}


% ==========================================
% SLIDE 15: BEYOND FOOD
% ==========================================
\begin{frame}
\textsf{\scriptsize\bfseries\color{LinkBlue}\uppercase{14 / Beyond Food}}
\vspace{0.2cm}

{\fontsize{22}{28}\sffamily\bfseries\color{CorporateNavy}
From Food to Neighborhood Commerce}

\vspace{0.8cm}
\begin{tabularx}{\textwidth}{@{} X X X @{}}
    \textsf{\small\bfseries\color{CorporateNavy} Today} &
    \textsf{\small\bfseries\color{CorporateNavy} Next} &
    \textsf{\small\bfseries\color{CorporateNavy} Later} \\[0.2cm]

    \textsf{\small Food} &
    \textsf{\small Groceries} &
    \textsf{\small Laundry} \\[0.2cm]

    &
    \textsf{\small Bakery} &
    \textsf{\small Local services} \\[0.2cm]

    &
    \textsf{\small Specialty foods} &
    \textsf{\small Errands} \\[0.2cm]

    &
    \textsf{\small Pharmacies} &
    \textsf{\small Broader local commerce} \\[0.2cm]

    &
    \textsf{\small Flowers} &
\end{tabularx}

\vspace{0.5cm}
\textsf{\small
The same platform can support additional categories as demand grows.}
\end{frame}


% ==========================================
% SLIDE 16: BUSINESS MODEL
% ==========================================
\begin{frame}
\textsf{\scriptsize\bfseries\color{LinkBlue}\uppercase{15 / Revenue Streams}}
\vspace{0.2cm}

{\fontsize{22}{28}\sffamily\bfseries\color{CorporateNavy}
Monetise the Ecosystem}

\vspace{0.8cm}
\begin{tabularx}{\textwidth}{@{} X X @{}}
    \textsf{\small\bfseries\color{CorporateNavy} Merchant Commission} &
    \textsf{\small Target: 12--15\% per order} \\[0.3cm]

    \textsf{\small\bfseries\color{CorporateNavy} Delivery Margin} &
    \textsf{\small Delivery fee less rider payout} \\[0.3cm]

    \textsf{\small\bfseries\color{CorporateNavy} Merchant Tools} &
    \textsf{\small Analytics and promoted placement} \\[0.3cm]

    \textsf{\small\bfseries\color{CorporateNavy} Membership} &
    \textsf{\small Optional subscriptions and reduced fees}
\end{tabularx}

\vspace{0.5cm}
\textsf{\small
Revenue grows with transactions, merchant value, and customer retention.}
\end{frame}


% ==========================================
% SLIDE 17: UNIT ECONOMICS
% ==========================================
\begin{frame}
\textsf{\scriptsize\bfseries\color{LinkBlue}\uppercase{16 / Unit Economics}}
\vspace{0.2cm}

{\fontsize{22}{28}\sffamily\bfseries\color{CorporateNavy}
Illustrative Contribution per Order}

\vspace{0.8cm}
\begin{tabularx}{\textwidth}{@{} X r @{}}
    \textsf{\small Average Order Value (AOV)} &
    \textsf{\small KES 900} \\[0.15cm]

    \textsf{\small Commission at 12\%} &
    \textsf{\small KES 108} \\[0.15cm]

    \textsf{\small Customer Delivery Fee} &
    \textsf{\small KES 100} \\[0.15cm]

    \textsf{\small Rider Payout} &
    \textsf{\small KES 90} \\[0.15cm]

    \textsf{\small Payment Cost} &
    \textsf{\small KES 18} \\[0.2cm]

    \hline

    \textsf{\small\bfseries Contribution per Order} &
    \textsf{\small\bfseries KES 100}
\end{tabularx}

\vspace{0.5cm}
\textsf{\small
Illustrative assumptions. Actual margins will depend on operating costs, order mix, and delivery performance.}
\end{frame}


% ==========================================
% SLIDE 18: ACQUISITION CHANNELS
% ==========================================
\begin{frame}
\textsf{\scriptsize\bfseries\color{LinkBlue}\uppercase{17 / Growth Channels}}
\vspace{0.2cm}

{\fontsize{22}{28}\sffamily\bfseries\color{CorporateNavy}
Grow Through the Neighborhood}

\vspace{0.8cm}
\begin{tabularx}{\textwidth}{@{} X @{}}
    \textsf{\small
    \textperiodcentered\ Merchant-led acquisition through existing customer bases} \\[0.2cm]

    \textsf{\small
    \textperiodcentered\ Campus outreach and student communities} \\[0.2cm]

    \textsf{\small
    \textperiodcentered\ Neighborhood ambassadors and referrals} \\[0.2cm]

    \textsf{\small
    \textperiodcentered\ Content that highlights local favourites} \\[0.2cm]

    \textsf{\small
    \textperiodcentered\ WhatsApp offers and community engagement} \\[0.2cm]

    \textsf{\small
    \textperiodcentered\ Partnerships with apartments, offices, and gyms}
\end{tabularx}

\vspace{0.4cm}
\textsf{\small
Local merchants and communities can become our strongest acquisition channels.}
\end{frame}


% ==========================================
% SLIDE 19: GROWTH MILESTONES
% ==========================================
\begin{frame}
\textsf{\scriptsize\bfseries\color{LinkBlue}\uppercase{18 / Growth Milestones}}
\vspace{0.2cm}

{\fontsize{22}{28}\sffamily\bfseries\color{CorporateNavy}
18-Month Execution Plan}

\vspace{0.8cm}
\begin{tabularx}{\textwidth}{@{} p{2.2cm} X @{}}

    \textsf{\small\bfseries\color{LinkBlue} Months 0--6} &
    \textsf{\small
    Launch the pilot, onboard 50+ merchants, reach 1,000+ customers, and target 4,000 monthly orders.} \\[0.4cm]

    \textsf{\small\bfseries\color{LinkBlue} Months 6--12} &
    \textsf{\small
    Grow to 150+ merchants, 10,000+ customers, and target 15,000 monthly orders.} \\[0.4cm]

    \textsf{\small\bfseries\color{LinkBlue} Months 12--18} &
    \textsf{\small
    Expand into adjacent hubs and target 30,000 monthly orders and KES 27M in monthly GMV.}

\end{tabularx}

\vspace{0.5cm}
\textsf{\small
These milestones are operating targets for the first 18 months.}
\end{frame}


% ==========================================
% SLIDE 20: GROWTH TRAJECTORY
% CLEAN MILESTONE LAYOUT
% ==========================================
\begin{frame}
\textsf{\scriptsize\bfseries\color{LinkBlue}\uppercase{19 / Growth Trajectory}}
\vspace{0.2cm}

{\fontsize{22}{28}\sffamily\bfseries\color{CorporateNavy}
18 Months to Local Scale}

\vspace{0.8cm}

\begin{tabularx}{\textwidth}{@{} p{2.2cm} X X X @{}}
    &
    \textsf{\small\bfseries\color{LinkBlue} MONTH 6} &
    \textsf{\small\bfseries\color{LinkBlue} MONTH 12} &
    \textsf{\small\bfseries\color{LinkBlue} MONTH 18} \\[0.4cm]

    \textsf{\small\bfseries\color{CorporateNavy} Orders / month} &
    \textsf{\small 4,000} &
    \textsf{\small 15,000} &
    \textsf{\small\bfseries 30,000} \\[0.35cm]

    \textsf{\small\bfseries\color{CorporateNavy} Merchants} &
    \textsf{\small 50+} &
    \textsf{\small 110+} &
    \textsf{\small\bfseries 175+} \\[0.35cm]

    \textsf{\small\bfseries\color{CorporateNavy} Riders} &
    \textsf{\small 25} &
    \textsf{\small 50} &
    \textsf{\small\bfseries 75} \\[0.35cm]

    \textsf{\small\bfseries\color{CorporateNavy} Monthly GMV} &
    \textsf{\small KES 3.6M} &
    \textsf{\small KES 13.5M} &
    \textsf{\small\bfseries KES 27M}
\end{tabularx}

\vspace{0.8cm}

\begin{tikzpicture}
    \draw[line width=2pt,color=CorporateNavy] (0,0) -- (0.72\textwidth,0);
    \draw[line width=2pt,color=LinkBlue] (0.72\textwidth,0) -- (\textwidth,0);
\end{tikzpicture}

\vspace{0.5cm}

\begin{tabularx}{\textwidth}{@{} X X @{}}
    \textsf{\small\color{DeepCharcoal} Average order value: KES 900} &
    \textsf{\small\bfseries\color{CorporateNavy} Target: 30,000 monthly orders}
\end{tabularx}

\end{frame}


% ==========================================
% SLIDE 20: USE OF FUNDS
% ==========================================
\begin{frame}
\textsf{\scriptsize\bfseries\color{LinkBlue}\uppercase{20 / Use of Funds}}
\vspace{0.2cm}

{\fontsize{22}{28}\sffamily\bfseries\color{CorporateNavy}
KES 3,000,000 Allocation}

\vspace{0.6cm}
\centering

{\fontsize{20}{26}\sffamily\bfseries\color{LinkBlue}
Engineering \& Infrastructure}
\vspace{0.1cm}
{\fontsize{16}{22}\sffamily\color{CorporateNavy}
30\% \quad -- \quad KES 900,000}

\vspace{0.4cm}

{\fontsize{20}{26}\sffamily\bfseries\color{LinkBlue}
Operations \& Logistics}
\vspace{0.1cm}
{\fontsize{16}{22}\sffamily\color{CorporateNavy}
20\% \quad -- \quad KES 600,000}

\vspace{0.4cm}

{\fontsize{20}{26}\sffamily\bfseries\color{LinkBlue}
Growth \quad + \quad Working Capital}
\vspace{0.1cm}
{\fontsize{16}{22}\sffamily\color{CorporateNavy}
30\% \quad -- \quad KES 900,000}

\vspace{0.4cm}

{\fontsize{20}{26}\sffamily\bfseries\color{LinkBlue}
Merchant Onboarding}
\vspace{0.1cm}
{\fontsize{16}{22}\sffamily\color{CorporateNavy}
10\% \quad -- \quad KES 300,000}

\vspace{0.4cm}

{\fontsize{20}{26}\sffamily\bfseries\color{LinkBlue}
Legal \& Admin \quad + \quad Contingency}
\vspace{0.1cm}
{\fontsize{16}{22}\sffamily\color{CorporateNavy}
10\% \quad -- \quad KES 300,000}

\end{frame}


% ==========================================
% SLIDE 22: ENGINEERING MOAT
% ==========================================
\begin{frame}
\textsf{\scriptsize\bfseries\color{LinkBlue}\uppercase{21 / Engineering is the Moat}}
\vspace{0.2cm}

{\fontsize{22}{28}\sffamily\bfseries\color{CorporateNavy}
Build the Infrastructure}

\vspace{0.8cm}
\begin{tabularx}{\textwidth}{@{} X @{}}
    \textsf{\small
    \textperiodcentered\ Reliable order and transaction engine} \\[0.25cm]

    \textsf{\small
    \textperiodcentered\ Clear order lifecycle from placement to delivery} \\[0.25cm]

    \textsf{\small
    \textperiodcentered\ Dispatch logic that matches riders to orders} \\[0.25cm]

    \textsf{\small
    \textperiodcentered\ Operational data that improves decisions over time} \\[0.25cm]

    \textsf{\small
    \textperiodcentered\ Practical merchant management tools} \\[0.25cm]

    \textsf{\small
    \textperiodcentered\ M-PESA payment integration}
\end{tabularx}
\end{frame}


% ==========================================
% SLIDE 23: CAPITAL EFFICIENCY
% ==========================================
\begin{frame}
\textsf{\scriptsize\bfseries\color{LinkBlue}\uppercase{22 / Capital Efficiency}}
\vspace{0.2cm}

{\fontsize{22}{28}\sffamily\bfseries\color{CorporateNavy}
KES 3M Buys Evidence}

\vspace{0.8cm}
\begin{tabularx}{\textwidth}{@{} X @{}}
    \textsf{\small
    \textperiodcentered\ A functioning end-to-end marketplace} \\[0.25cm]

    \textsf{\small
    \textperiodcentered\ Operational order fulfilment and dispatch} \\[0.25cm]

    \textsf{\small
    \textperiodcentered\ A curated and active merchant network} \\[0.25cm]

    \textsf{\small
    \textperiodcentered\ Evidence of customer retention and repeat orders} \\[0.25cm]

    \textsf{\small
    \textperiodcentered\ Validated contribution per order} \\[0.25cm]

    \textsf{\small
    \textperiodcentered\ Measurable neighborhood-level demand} \\[0.25cm]

    \textsf{\small
    \textperiodcentered\ A repeatable playbook for expansion}
\end{tabularx}
\end{frame}


% ==========================================
% SLIDE 24: OUR MOAT
% ==========================================
\begin{frame}
\textsf{\scriptsize\bfseries\color{LinkBlue}\uppercase{23 / Defensibility}}
\vspace{0.2cm}

{\fontsize{22}{28}\sffamily\bfseries\color{CorporateNavy}
Density + Data + Trust}

\vspace{0.8cm}
\begin{tabularx}{\textwidth}{@{} X @{}}
    \textsf{\small
    \textbf{Density:} More active local participants create more opportunities for orders.} \\[0.3cm]

    \textsf{\small
    \textbf{Data:} Order and delivery history can improve routing and operational decisions.} \\[0.3cm]

    \textsf{\small
    \textbf{Trust:} Consistent service and reliable merchants encourage repeat use.}
\end{tabularx}

\vspace{0.5cm}
\textsf{\small
Our long-term advantage is built neighborhood by neighborhood.}
\end{frame}


% ==========================================
% SLIDE 25: THE VISION
% ==========================================
\begin{frame}
\textsf{\scriptsize\bfseries\color{LinkBlue}\uppercase{24 / The Vision}}
\vspace{0.2cm}

{\fontsize{22}{28}\sffamily\bfseries\color{CorporateNavy}
The Neighborhood Operating System}

\vspace{0.8cm}
\begin{tabularx}{\textwidth}{@{} X @{}}
    \textsf{\small
    \textperiodcentered\ Today: make local food businesses easier to discover and access.} \\[0.3cm]

    \textsf{\small
    \textperiodcentered\ Next: connect more neighborhood merchants and essential services.} \\[0.3cm]

    \textsf{\small
    \textperiodcentered\ Long term: provide the digital infrastructure for local commerce.} \\[0.3cm]

    \textsf{\small
    \textperiodcentered\ \textbf{Our vision: make neighborhood commerce accessible, convenient, and connected.}}
\end{tabularx}
\end{frame}


% ==========================================
% SLIDE 25: LEADERSHIP
% ==========================================
\begin{frame}
\textsf{\scriptsize\bfseries\color{LinkBlue}\uppercase{25 / Leadership}}
\vspace{0.2cm}

{\fontsize{22}{28}\sffamily\bfseries\color{CorporateNavy}
The Founder}

\vspace{1.2cm}
\centering

{\fontsize{32}{38}\sffamily\bfseries\color{LinkBlue}
Dean Ndere}

\vspace{0.6cm}

{\fontsize{20}{26}\sffamily\bfseries\color{CorporateNavy}
CEO \& Founder}

\vspace{1.0cm}

{\fontsize{16}{22}\sffamily\color{DeepCharcoal}
\textperiodcentered\ Building better access to neighborhood commerce.}

\vspace{0.8cm}

{\fontsize{14}{20}\sffamily\color{LinkBlue}
\textperiodcentered\ Leading product, technology, and operations for Muncheez.}

\vspace{1.2cm}

\textsf{\small\color{DeepCharcoal}
\textperiodcentered\ Core leadership spans technology, product, logistics, and growth.}
\end{frame}


% ==========================================
% SLIDE 27: WHY NOW
% ==========================================
\begin{frame}
\textsf{\scriptsize\bfseries\color{LinkBlue}\uppercase{26 / Market Timing}}
\vspace{0.2cm}

{\fontsize{22}{28}\sffamily\bfseries\color{CorporateNavy}
Kenya Is Ready}

\vspace{0.8cm}
\begin{tabularx}{\textwidth}{@{} X @{}}
    \textsf{\small
    \textperiodcentered\ Widespread mobile-money adoption supports digital payments.} \\[0.25cm]

    \textsf{\small
    \textperiodcentered\ Growing mobile-data access makes digital discovery more practical.} \\[0.25cm]

    \textsf{\small
    \textperiodcentered\ Independent businesses need efficient ways to reach customers.} \\[0.25cm]

    \textsf{\small
    \textperiodcentered\ Urban and student communities create opportunities for localized demand.}
\end{tabularx}

\vspace{0.5cm}
\textsf{\small
The opportunity is to connect existing customers, businesses, payments, and delivery.}
\end{frame}


% ==========================================
% SLIDE 28: THE ASK
% ==========================================
\begin{frame}
\textsf{\scriptsize\bfseries\color{LinkBlue}\uppercase{27 / The Investment Opportunity}}
\vspace{0.2cm}

{\fontsize{22}{28}\sffamily\bfseries\color{CorporateNavy}
KES 3,000,000 Pre-Seed}

\vspace{0.8cm}
\begin{tabularx}{\textwidth}{@{} X @{}}
    \textsf{\small
    We are raising KES 3 million to strengthen the platform, launch our pilot, build neighborhood density, and validate unit economics.} \\[0.4cm]

    \textsf{\small
    The objective is clear: demonstrate reliable operations, repeat demand, and a model that can scale neighborhood by neighborhood.} \\[0.4cm]

    \textsf{\small\bfseries\color{CorporateNavy}
    Let's build the neighborhood operating system together.}
\end{tabularx}
\end{frame}

\end{document}