"""
AI-powered insights generator using local LLM (LM Studio)
Generates contextual insights based on RFM data and forecasts
"""
import httpx
import json
import logging
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

# LM Studio configuration
LM_STUDIO_URL = "http://127.0.0.1:1234/v1/chat/completions"
LM_STUDIO_API_KEY = "lm-studio"
MODEL_NAME = "meta-llama-3.1-8b-instruct"


async def generate_marketing_insights(
    rfm_data: Dict,
    forecast_data: Dict,
    filters: Dict
) -> Dict[str, List[Dict]]:
    """
    Generate AI insights for marketing dashboard based on current data and filters
    
    Args:
        rfm_data: RFM segmentation data with customer counts and revenue
        forecast_data: Forecast data with predictions and historical baselines
        filters: Current filter state (region, category, date_range, data_mode)
        
    Returns:
        Dictionary with categorized insights (champions, at_risk, loyal, overview)
    """
    try:
        # Build context from data
        context = _build_data_context(rfm_data, forecast_data, filters)
        
        # Generate insights using LLM
        system_prompt = _build_system_prompt()
        user_prompt = _build_insights_prompt(context)
        
        insights_text = await _call_lm_studio(system_prompt, user_prompt)
        
        # Parse insights into structured format
        insights = _parse_insights(insights_text, rfm_data, forecast_data)
        
        return insights
        
    except Exception as e:
        logger.error(f"Failed to generate insights: {e}")
        # Return fallback insights
        return _generate_fallback_insights(rfm_data, forecast_data)


def _build_data_context(rfm_data: Dict, forecast_data: Dict, filters: Dict) -> str:
    """Build context string from data"""
    segments = rfm_data.get('segments', [])
    total_customers = rfm_data.get('totalCustomers', 0)
    total_revenue = rfm_data.get('totalRevenue', 0)
    
    # Find key segments
    champions = next((s for s in segments if s['segment_name'] == 'Champions'), None)
    at_risk = next((s for s in segments if s['segment_name'] == 'At-Risk'), None)
    loyal = next((s for s in segments if s['segment_name'] == 'Loyal'), None)
    hibernating = next((s for s in segments if s['segment_name'] == 'Hibernating'), None)
    
    # Get forecast trends
    customer_growth = forecast_data.get('customerGrowth', 0)
    revenue_growth = forecast_data.get('revenueGrowth', 0)
    
    # Build filter description
    filter_desc = "Overall"
    if filters.get('region') and filters['region'] != 'all':
        filter_desc = f"Region: {filters['region']}"
    elif filters.get('category') and filters['category'] != 'all':
        filter_desc = f"Category: {filters['category']}"
    
    time_period = filters.get('dateRange', 'all 4 weeks')
    data_mode = filters.get('dataMode', 'predicted')
    
    context = f"""
DATA OVERVIEW ({filter_desc}, {time_period}, {data_mode} mode):
- Total Customers: {total_customers:,}
- Total Revenue: ${total_revenue:,.0f}
- Customer Growth Trend: {customer_growth:+.2f}%
- Revenue Growth Trend: {revenue_growth:+.2f}%

CUSTOMER SEGMENTS:
"""
    
    if champions:
        context += f"- Champions: {champions['customer_count']:,} customers (${champions.get('total_revenue', 0):,.0f} revenue)\n"
    
    if at_risk:
        context += f"- At-Risk: {at_risk['customer_count']:,} customers (${at_risk.get('total_revenue', 0):,.0f} revenue)\n"
    
    if loyal:
        context += f"- Loyal: {loyal['customer_count']:,} customers (${loyal.get('total_revenue', 0):,.0f} revenue)\n"
    
    if hibernating:
        context += f"- Hibernating: {hibernating['customer_count']:,} customers (${hibernating.get('total_revenue', 0):,.0f} revenue)\n"
    
    context += f"\nTOTAL SEGMENTS: {len(segments)} distinct customer groups analyzed"
    
    return context


def _build_system_prompt() -> str:
    """Build system prompt for the AI"""
    return (
        "You are a strategic retail marketing advisor. "
        "Your goal: suggest specific marketing actions to convert ALL customers into high-value, high-frequency buyers. "
        "For each customer segment, provide concrete tactics to increase purchase frequency and spending. "
        "Focus on actionable campaigns, offers, and engagement strategies. "
        "Be specific with marketing channels, timing, and incentive structures. "
        "Think like a growth marketer focused on customer lifetime value optimization."
    )


def _build_insights_prompt(context: str) -> str:
    """Build the specific prompt for insights generation"""
    return f"""{context}

As a growth marketing strategist, suggest 4 specific marketing actions to convert these segments into HIGH-VALUE, HIGH-FREQUENCY customers.

STRICT FORMAT RULES:
- Start each action with exactly: "CHAMPIONS:", "AT-RISK:", "LOYAL:", or "OVERVIEW:"
- Follow the colon with a clear campaign name (e.g., "CHAMPIONS: VIP Loyalty Program")
- Then describe the specific tactic in detail on the next lines
- DO NOT use "**" or other markdown in the campaign name line
- Keep campaign names short and clear (3-6 words)

1. CHAMPIONS → SUPER CHAMPIONS: What marketing actions will increase their purchase frequency and basket size?

2. AT-RISK → REACTIVATION: What targeted campaigns will bring them back and increase their future purchase frequency?

3. LOYAL → CHAMPIONS: What upsell/cross-sell tactics will convert loyal customers into champions?

4. OVERVIEW STRATEGY: What company-wide marketing initiative will maximize customer lifetime value across all segments?

EXAMPLE FORMAT:
CHAMPIONS: VIP Rewards Program
Launch a 3-tier loyalty program with Gold (10% off), Platinum (15% off), and Diamond (20% off) levels. Reward high-frequency purchases with exclusive early access to new products.

Be tactical and specific - think like a CMO planning next quarter's campaigns."""


async def _call_lm_studio(system_prompt: str, user_prompt: str, temperature: float = 0.3) -> str:
    """Call LM Studio local LLM API"""
    headers = {
        "Authorization": f"Bearer {LM_STUDIO_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": MODEL_NAME,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": temperature,
        "max_tokens": 500
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(LM_STUDIO_URL, json=payload, headers=headers)
            response.raise_for_status()
            
            result = response.json()
            
            if "choices" in result and len(result["choices"]) > 0:
                return result["choices"][0]["message"]["content"]
            else:
                raise Exception("Invalid response format from LM Studio")
                
    except httpx.ConnectError:
        logger.error("Cannot connect to LM Studio at http://127.0.0.1:1234")
        raise Exception("LM Studio is not running. Please start LM Studio.")
    except Exception as e:
        logger.error(f"LM Studio call failed: {e}")
        raise


def _parse_insights(insights_text: str, rfm_data: Dict, forecast_data: Dict) -> Dict[str, List[Dict]]:
    """Parse LLM response into structured insights"""
    segments = rfm_data.get('segments', [])
    total_customers = rfm_data.get('totalCustomers', 0)
    total_revenue = rfm_data.get('totalRevenue', 0)
    
    champions = next((s for s in segments if s['segment_name'] == 'Champions'), {})
    at_risk = next((s for s in segments if s['segment_name'] == 'At-Risk'), {})
    loyal = next((s for s in segments if s['segment_name'] == 'Loyal'), {})
    
    # Split insights by lines
    lines = [line.strip() for line in insights_text.split('\n') if line.strip()]
    
    logger.info(f"Parsing {len(lines)} lines of AI insights")
    
    insights = {
        'champions': [],
        'at_risk': [],
        'loyal': [],
        'overview': []
    }
    
    current_category = None
    current_title = None
    current_description = []
    
    for line in lines:
        # Detect category headers
        if 'CHAMPIONS' in line.upper() or 'RETENTION' in line.upper():
            if current_category and current_title:
                _add_parsed_insight(insights, current_category, current_title, ' '.join(current_description))
            current_category = 'champions'
            # Extract title more robustly
            if ':' in line:
                title_part = line.split(':', 1)[1].strip()
                # Clean up markdown formatting
                title_part = title_part.replace('**', '').replace('*', '').strip()
                current_title = title_part if title_part and title_part not in ['', '-', '•'] else 'Champions Retention'
            else:
                current_title = 'Champions Retention'
            current_description = []
        elif 'AT-RISK' in line.upper() or 'RECOVERY' in line.upper() or 'REACTIVATION' in line.upper():
            if current_category and current_title:
                _add_parsed_insight(insights, current_category, current_title, ' '.join(current_description))
            current_category = 'at_risk'
            if ':' in line:
                title_part = line.split(':', 1)[1].strip()
                title_part = title_part.replace('**', '').replace('*', '').strip()
                current_title = title_part if title_part and title_part not in ['', '-', '•'] else 'At-Risk Recovery'
            else:
                current_title = 'At-Risk Recovery'
            current_description = []
        elif 'LOYAL' in line.upper() or 'GROWTH' in line.upper():
            if current_category and current_title:
                _add_parsed_insight(insights, current_category, current_title, ' '.join(current_description))
            current_category = 'loyal'
            if ':' in line:
                title_part = line.split(':', 1)[1].strip()
                title_part = title_part.replace('**', '').replace('*', '').strip()
                current_title = title_part if title_part and title_part not in ['', '-', '•'] else 'Loyal Customers'
            else:
                current_title = 'Loyal Customers'
            current_description = []
        elif 'SEGMENT' in line.upper() or 'OVERVIEW' in line.upper() or 'STRATEGY' in line.upper():
            if current_category and current_title:
                _add_parsed_insight(insights, current_category, current_title, ' '.join(current_description))
            current_category = 'overview'
            if ':' in line:
                title_part = line.split(':', 1)[1].strip()
                title_part = title_part.replace('**', '').replace('*', '').strip()
                current_title = title_part if title_part and title_part not in ['', '-', '•'] else 'Segment Overview'
            else:
                current_title = 'Segment Overview'
            current_description = []
        else:
            # Description line
            if current_category:
                current_description.append(line)
    
    # Add last insight
    if current_category and current_title:
        _add_parsed_insight(insights, current_category, current_title, ' '.join(current_description))
    
    # If parsing didn't yield insights, add strategic action-oriented defaults
    if not insights['champions']:
        champ_count = champions.get('customer_count', 0) if champions else 0
        champ_revenue = champions.get('total_revenue', 0) if champions else 0
        avg_per_champion = champ_revenue / champ_count if champ_count > 0 else 0
        insights['champions'].append({
            'title': 'Champions Retention',
            'description': f"**Target:** {champ_count:,} champions (${champ_revenue:,.0f}, ${avg_per_champion:,.0f}/customer)\n\n**3-Tier VIP Program:**\n• Gold: 10% off + free shipping\n• Platinum: 15% off + early access\n• Diamond: 20% off + concierge\n\n**Goal:** Increase repeat purchase rate by 35%",
            'icon': 'target',
            'color': 'green'
        })
    
    if not insights['at_risk']:
        risk_count = at_risk.get('customer_count', 0) if at_risk else 0
        risk_revenue = at_risk.get('total_revenue', 0) if at_risk else 0
        insights['at_risk'].append({
            'title': 'At-Risk Recovery',
            'description': f"**Urgent:** {risk_count:,} at-risk customers. **${risk_revenue:,.0f}** at stake\n\n**7-Day Win-Back:**\n• Day 1: 'We miss you' + 20% off\n• Day 4: Free shipping added\n• Day 7: Final 30% flash sale\n\n**Frequency Boost:** Buy 2, Get 3rd Free\n\n**Expected:** 25% recovery rate",
            'icon': 'trending-up',
            'color': 'orange'
        })
    
    if not insights['loyal']:
        loyal_count = loyal.get('customer_count', 0) if loyal else 0
        loyal_revenue = loyal.get('total_revenue', 0) if loyal else 0
        insights['loyal'].append({
            'title': 'Loyal Customers',
            'description': f"**Target:** {loyal_count:,} loyal buyers (${loyal_revenue:,.0f})\n\n**Champion Conversion:**\n• Bundle 3 premium items at 25% off\n• 'Monthly Premium Box' subscription (20% off + exclusives)\n• Personalized upsell emails every 2 weeks\n\n**Goal:** 50% champion conversion in 60 days",
            'icon': 'users',
            'color': 'purple'
        })
    
    if not insights['overview']:
        insights['overview'].append({
            'title': 'Segment Overview',
            'description': f"**{len(segments)} segments** analyzed using RFM\n\n**CLV Maximization:**\n• **Referral:** 'Refer & Earn' - $25 for referrer + referee\n• **Points:** Earn 1 point per $1, redeem at 100 points\n• **Gamification:** Milestones unlock tiers\n• **Engagement:** Monthly personalized offers\n\n**Goal:** 3x purchase frequency within 6 months",
            'icon': 'pie-chart',
            'color': 'blue'
        })
    
    logger.info(f"Parsed insights: champions={len(insights['champions'])}, at_risk={len(insights['at_risk'])}, loyal={len(insights['loyal'])}, overview={len(insights['overview'])}")
    return insights


def _add_parsed_insight(insights: Dict, category: str, title: str, description: str):
    """Helper to add parsed insight"""
    if description:
        logger.debug(f"Adding insight: category={category}, title='{title}', desc_length={len(description)}")
        insights[category].append({
            'title': title,
            'description': description,
            'icon': _get_icon_for_category(category),
            'color': _get_color_for_category(category)
        })


def _get_icon_for_category(category: str) -> str:
    """Get icon name for category"""
    icons = {
        'champions': 'target',
        'at_risk': 'trending-up',
        'loyal': 'users',
        'overview': 'pie-chart'
    }
    return icons.get(category, 'info')


def _get_color_for_category(category: str) -> str:
    """Get color for category"""
    colors = {
        'champions': 'green',
        'at_risk': 'orange',
        'loyal': 'purple',
        'overview': 'blue'
    }
    return colors.get(category, 'gray')


def _generate_fallback_insights(rfm_data: Dict, forecast_data: Dict) -> Dict[str, List[Dict]]:
    """Generate fallback insights if LLM fails"""
    logger.info("Generating fallback insights")
    segments = rfm_data.get('segments', [])
    total_customers = rfm_data.get('totalCustomers', 0)
    total_revenue = rfm_data.get('totalRevenue', 0)
    
    champions = next((s for s in segments if s.get('segment_name') == 'Champions'), None)
    at_risk = next((s for s in segments if s.get('segment_name') == 'At-Risk'), None)
    loyal = next((s for s in segments if s.get('segment_name') == 'Loyal'), None)
    
    logger.info(f"Segments found - Champions: {champions is not None}, At-Risk: {at_risk is not None}, Loyal: {loyal is not None}")
    
    insights = {
        'champions': [],
        'at_risk': [],
        'loyal': [],
        'overview': []
    }
    
    # Champions insight - Focus on increasing frequency and basket size
    if champions:
        champ_count = champions.get('customer_count', 0)
        champ_revenue = champions.get('total_revenue', 0)
        avg_per_champion = champ_revenue / champ_count if champ_count > 0 else 0
        insights['champions'].append({
            'title': 'VIP Loyalty Program Launch',
            'description': f"**Target:** {champ_count:,} champions (${champ_revenue:,.0f} revenue, ${avg_per_champion:,.0f}/customer)\n\n**Strategy:** Launch 3-tier VIP program\n• Gold: 10% off + free shipping\n• Platinum: 15% off + early access\n• Diamond: 20% off + concierge service\n\n**Goal:** Increase purchase frequency by 30%",
            'icon': 'target',
            'color': 'green'
        })
    else:
        insights['champions'].append({
            'title': 'VIP Loyalty Program Launch',
            'description': "**Strategy:** Launch tiered VIP program for top customers\n• Gold: 10% off + free shipping\n• Platinum: 15% off + early access  \n• Diamond: 20% off + concierge\n\n**Goal:** Increase purchase frequency by 30% and basket size by 25%",
            'icon': 'target',
            'color': 'green'
        })
    
    # At-Risk insight - Aggressive win-back with frequency incentives
    if at_risk:
        risk_count = at_risk.get('customer_count', 0)
        risk_revenue = at_risk.get('total_revenue', 0)
        insights['at_risk'].append({
            'title': 'At-Risk Recovery',
            'description': f"**Target:** {risk_count:,} at-risk customers need reactivation. Potential revenue at stake: **${risk_revenue:,.0f}**\n\n**7-Day Email Campaign:**\n• Day 1: 'We miss you' + 20% off\n• Day 3: Free shipping added\n• Day 7: Final 25% flash sale\n\n**Frequency Boost:** Buy 3 in 60 days, get 4th free\n\n**Expected Recovery:** 25% reactivation rate",
            'icon': 'trending-up',
            'color': 'orange'
        })
    else:
        insights['at_risk'].append({
            'title': 'At-Risk Recovery',
            'description': "**7-Day Win-Back Campaign:**\n• Day 1: 'We miss you' + 20% off\n• Day 3: Free shipping added\n• Day 7: Final 30% flash sale\n\n**Frequency Incentive:** Buy 3 in 60 days, get 4th free\n\n**Goal:** 25% reactivation rate with increased purchase frequency",
            'icon': 'trending-up',
            'color': 'orange'
        })
    
    # Loyal insight - Convert to champions through upsell and frequency
    if loyal:
        loyal_count = loyal.get('customer_count', 0)
        loyal_revenue = loyal.get('total_revenue', 0)
        insights['loyal'].append({
            'title': 'Loyal Customers',
            'description': f"**Target:** {loyal_count:,} loyal customers generating **${loyal_revenue:,.0f}**\n\n**Conversion Strategy:**\n• Launch 'Monthly Favorites' subscription box (15% off + exclusive items)\n• Bundle 3 premium products at 25% off\n• Send bi-weekly personalized upsell emails\n\n**Goal:** Convert 40% to champions within 90 days",
            'icon': 'users',
            'color': 'purple'
        })
    else:
        insights['loyal'].append({
            'title': 'Loyal Customers',
            'description': "**Subscription Strategy:**\n• Launch 'Monthly Favorites' box: 15% off + exclusives\n• Bundle premium items at 25% discount\n• Bi-weekly personalized upsell emails\n\n**Goal:** Convert 40% of loyal customers to champions through increased frequency and spend",
            'icon': 'users',
            'color': 'purple'
        })
    
    # Overview - Company-wide CLV strategy
    insights['overview'].append({
        'title': 'Segment Overview',
        'description': f"**{len(segments)} distinct customer segments** analyzed using RFM (Recency, Frequency, Monetary)\n\n**Company-Wide Initiatives:**\n• **Referral Program:** 'Refer 3 Friends, Get $50'\n• **Points System:** 1 point = $1 spent, 100 points = $10 off\n• **Monthly Engagement:** Personalized recommendations + birthday offers\n\n**Target:** Increase purchase frequency from 2x to 4x per year. Check RFM dashboard for detailed segment analysis.",
        'icon': 'pie-chart',
        'color': 'blue'
    })
    
    logger.info(f"Fallback insights generated: {list(insights.keys())}")
    return insights

