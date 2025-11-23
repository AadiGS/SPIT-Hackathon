"""
AI-powered insights generation using LM Studio.
"""

import requests
import json
import logging
from typing import Dict, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

LM_STUDIO_URL = "http://127.0.0.1:1234/v1/chat/completions"
DEFAULT_TIMEOUT = 60  # seconds


def generate_insights(forecast_summary: Dict, context: Dict) -> Dict[str, any]:
    """
    Generate AI insights from forecast results using LM Studio.
    
    Args:
        forecast_summary: Summary of forecast results
        context: Additional context (clusters, RFM segments, etc.)
        
    Returns:
        Dictionary with insights and recommended actions
    """
    try:
        # Build prompt
        logger.info("Building insight prompt from forecast summary...")
        prompt = build_insight_prompt(forecast_summary, context)
        logger.info(f"[OK] Prompt built: {len(prompt)} characters")
        logger.debug(f"Prompt preview: {prompt[:200]}...")
        
        # Call LM Studio with Llama model
        logger.info(f"Calling LM Studio at {LM_STUDIO_URL}...")
        response = requests.post(
            LM_STUDIO_URL,
            headers={
                "Authorization": "Bearer lm-studio",
                "Content-Type": "application/json"
            },
            json={
                "model": "meta-llama-3.1-8b-instruct",
                "messages": [
                    {
                        "role": "system",
                        "content": "You are an expert data analyst specializing in retail forecasting and business intelligence. Provide concise, actionable insights based on forecast data."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                "temperature": 0.7,
                "max_tokens": 1000
            },
            timeout=DEFAULT_TIMEOUT
        )
        
        logger.info(f"[OK] LM Studio response: status {response.status_code}, {len(response.text)} chars")
        
        if response.status_code == 200:
            result = response.json()
            logger.debug(f"Response JSON keys: {list(result.keys())}")
            ai_response = result['choices'][0]['message']['content']
            logger.info(f"[OK] AI response received: {len(ai_response)} chars")
            logger.debug(f"AI response preview: {ai_response[:200]}...")
            
            # Parse response
            parsed = parse_ai_response(ai_response)
            logger.info(f"[OK] Parsed: {len(parsed['insights'])} insights, {len(parsed['actions'])} actions")
            
            logger.info("[SUCCESS] Generated AI insights successfully")
            return {
                'insights': parsed['insights'],
                'actions': parsed['actions'],
                'raw_response': ai_response,
                'generated_at': datetime.utcnow().isoformat()
            }
        else:
            logger.error(f"LM Studio returned status {response.status_code}: {response.text}")
            return None
            
    except requests.exceptions.Timeout:
        logger.error("LM Studio request timed out")
        return None
    except requests.exceptions.ConnectionError as e:
        logger.error(f"Could not connect to LM Studio at {LM_STUDIO_URL}: {e}")
        return None
    except Exception as e:
        logger.error(f"Error generating insights: {e}", exc_info=True)
        return None


def build_insight_prompt(forecast_summary: Dict, context: Dict) -> str:
    """
    Build prompt for LM Studio based on forecast and context data.
    
    Args:
        forecast_summary: Summary of forecast results
        context: Additional context data
        
    Returns:
        Formatted prompt string
    """
    prompt = "Analyze the following retail forecast data and provide insights:\n\n"
    
    # Overall metrics
    if 'overall' in forecast_summary and forecast_summary['overall']:
        prompt += "## Overall Forecast (Next 28 Days)\n"
        for metric_data in forecast_summary['overall']:
            try:
                metric = metric_data['metric']
                forecast = metric_data['forecast']
                total_forecast = forecast['yhat'].sum()
                avg_forecast = forecast['yhat'].mean()
                
                prompt += f"- **{metric}**: Total={total_forecast:.2f}, Daily Avg={avg_forecast:.2f}\n"
            except Exception as e:
                logger.warning(f"Error processing overall metric {metric_data.get('metric', 'unknown')}: {e}")
                continue
        prompt += "\n"
    
    # Country breakdown
    if 'country' in forecast_summary and forecast_summary['country']:
        prompt += "## Top Countries by Revenue Forecast\n"
        country_revenues = {}
        for metric_data in forecast_summary['country']:
            try:
                if metric_data['metric'] == 'total_revenue':
                    country = metric_data['group_key']
                    total = metric_data['forecast']['yhat'].sum()
                    country_revenues[country] = total
            except Exception as e:
                logger.warning(f"Error processing country metric: {e}")
                continue
        
        for country, revenue in sorted(country_revenues.items(), key=lambda x: x[1], reverse=True)[:5]:
            prompt += f"- {country}: ${revenue:.2f}\n"
        prompt += "\n"
    
    # Product cluster breakdown
    if 'product_cluster' in forecast_summary and forecast_summary['product_cluster']:
        prompt += "## Top Product Clusters by Revenue Forecast\n"
        cluster_revenues = {}
        for metric_data in forecast_summary['product_cluster']:
            try:
                if metric_data['metric'] == 'total_revenue':
                    cluster = metric_data['group_key']
                    total = metric_data['forecast']['yhat'].sum()
                    cluster_revenues[cluster] = total
            except Exception as e:
                logger.warning(f"Error processing product cluster metric: {e}")
                continue
        
        for cluster, revenue in sorted(cluster_revenues.items(), key=lambda x: x[1], reverse=True)[:5]:
            prompt += f"- {cluster}: ${revenue:.2f}\n"
        prompt += "\n"
    
    # Product clusters
    if 'product_clusters' in context and context['product_clusters']:
        prompt += "## Product Clusters\n"
        for cluster in context['product_clusters'][:5]:
            prompt += f"- Cluster {cluster['cluster_id']}: {cluster['cluster_size']} products, "
            prompt += f"Keywords: {', '.join(cluster.get('top_terms', [])[:3])}\n"
        prompt += "\n"
    
    # RFM segments
    if 'rfm_stats' in context and context['rfm_stats']:
        prompt += "## Customer Segments (RFM)\n"
        for segment, stats in context['rfm_stats'].items():
            prompt += f"- **{segment}**: {stats['count']} customers, "
            prompt += f"Avg Revenue=${stats.get('avg_revenue', 0):.2f}\n"
        prompt += "\n"
    
    # Request specific insights
    prompt += """
Based on this data, provide:

1. **Three Key Insights**: What are the most important patterns or trends in this forecast?

2. **Three Recommended Actions**: What specific actions should the business take based on these forecasts?

Format your response as:

INSIGHTS:
1. [First insight]
2. [Second insight]
3. [Third insight]

ACTIONS:
1. [First action]
2. [Second action]
3. [Third action]
"""
    
    return prompt


def parse_ai_response(response: str) -> Dict[str, List[str]]:
    """
    Parse AI response into structured insights and actions.
    
    Args:
        response: Raw AI response text
        
    Returns:
        Dictionary with insights and actions lists
    """
    insights = []
    actions = []
    
    lines = response.strip().split('\n')
    current_section = None
    
    for line in lines:
        line = line.strip()
        
        if 'INSIGHTS:' in line.upper():
            current_section = 'insights'
        elif 'ACTIONS:' in line.upper() or 'RECOMMENDED ACTIONS:' in line.upper():
            current_section = 'actions'
        elif line and current_section:
            # Extract numbered items
            # Handle formats like "1.", "1)", "1 -", or just starting with number
            cleaned = line.lstrip('0123456789.-) ')
            if cleaned and len(cleaned) > 10:  # Avoid empty or very short lines
                if current_section == 'insights':
                    insights.append(cleaned)
                elif current_section == 'actions':
                    actions.append(cleaned)
    
    # Fallback: if parsing failed, split by sentences
    if not insights and not actions:
        sentences = [s.strip() for s in response.split('.') if len(s.strip()) > 20]
        if len(sentences) >= 3:
            insights = sentences[:3]
        if len(sentences) >= 6:
            actions = sentences[3:6]
    
    return {
        'insights': insights[:3],  # Limit to 3
        'actions': actions[:3]      # Limit to 3
    }


def generate_fallback_insights(forecast_summary: Dict, context: Dict) -> Dict[str, any]:
    """
    Generate basic insights without AI when LM Studio is unavailable.
    
    Args:
        forecast_summary: Summary of forecast results
        context: Additional context data
        
    Returns:
        Dictionary with basic insights
    """
    insights = []
    actions = []
    
    # Basic revenue insight
    if 'overall' in forecast_summary:
        for metric_data in forecast_summary['overall']:
            if metric_data['metric'] == 'total_revenue':
                total_revenue = metric_data['forecast']['yhat'].sum()
                insights.append(f"Total forecasted revenue for next 28 days: ${total_revenue:,.2f}")
                actions.append("Monitor daily revenue against forecast to identify early deviations")
    
    # Country insight
    if 'country' in forecast_summary:
        country_count = len(set(m['group_key'] for m in forecast_summary['country']))
        insights.append(f"Forecasts generated for {country_count} different countries")
        actions.append("Focus marketing efforts on top-performing countries")
    
    # Cluster insight
    if 'product_clusters' in context:
        cluster_count = len(context['product_clusters'])
        insights.append(f"Products organized into {cluster_count} distinct clusters")
        actions.append("Develop targeted strategies for each product cluster")
    
    return {
        'insights': insights,
        'actions': actions,
        'raw_response': 'Fallback insights (LM Studio unavailable)',
        'generated_at': datetime.utcnow().isoformat()
    }
