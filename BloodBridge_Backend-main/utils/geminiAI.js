const mongoose = require('mongoose');
const User = require('../models/User');
const Donation = require('../models/Donation');

/**
 * Detects collusion and fraudulent activity between a requester and a donor.
 * Uses Gemini AI API if GEMINI_API_KEY is defined in process.env, or a rule-based fallback.
 * 
 * @param {Object} requester - The user requesting blood
 * @param {Object} donor - The donor who scheduled/completed the donation
 * @param {String} posterComment - Optional verification notes or comments written by the hospital/poster
 * @returns {Promise<Object>} - { isFraudulent: boolean, confidence: number, reason: string }
 */
const checkCollusion = async (requester, donor, posterComment = '') => {
  const apiKey = process.env.GEMINI_API_KEY;

  // 1. Gather historical interaction details
  // Find how many times this specific donor has donated to this specific requester
  let previousDonationsCount = 0;
  let reciprocalDonationsCount = 0;

  try {
    previousDonationsCount = await Donation.countDocuments({
      donor: donor._id,
      status: 'Completed',
      $or: [
        { requester: requester._id },
        {
          request: {
            $in: await mongoose.model('BloodRequest').find({ requester: requester._id }).distinct('_id')
          }
        }
      ]
    });

    reciprocalDonationsCount = await Donation.countDocuments({
      donor: requester._id,
      status: 'Completed',
      $or: [
        { requester: donor._id },
        {
          request: {
            $in: await mongoose.model('BloodRequest').find({ requester: donor._id }).distinct('_id')
          }
        }
      ]
    });
  } catch (err) {
    // If mongoose models aren't fully resolved in this scope yet, we default
    console.warn('Failed to query historical donation counts:', err.message);
  }

  // 2. Format details for analysis
  const requesterInfo = {
    id: requester._id.toString(),
    name: requester.name,
    email: requester.email,
    role: requester.role,
    trustScore: requester.trustScore
  };

  const donorInfo = {
    id: donor._id.toString(),
    name: donor.name,
    email: donor.email,
    role: donor.role,
    trustScore: donor.trustScore
  };

  const analysisContext = {
    requester: requesterInfo,
    donor: donorInfo,
    history: {
      donorToRequesterCount: previousDonationsCount,
      requesterToDonorCount: reciprocalDonationsCount,
      totalPreviousMutualTransactions: previousDonationsCount + reciprocalDonationsCount
    },
    verificationComment: posterComment || 'No comments provided.'
  };

  // 3. Fallback check if Gemini API key is missing
  if (!apiKey) {
    console.log('Gemini API key is not present. Executing rule-based collusion check fallback...');
    
    let isFraudulent = false;
    let confidence = 0;
    let reason = 'Normal activity detected.';

    // Check same user ID (self-donation)
    if (requesterInfo.id === donorInfo.id) {
      isFraudulent = true;
      confidence = 100;
      reason = 'Abuse Detected: User cannot donate to their own request.';
    }
    // Check mutual points harvesting (high frequency)
    else if (analysisContext.history.totalPreviousMutualTransactions >= 3) {
      isFraudulent = true;
      confidence = 90;
      reason = `Abuse Detected: Unusually high frequency of mutual blood exchanges (${analysisContext.history.totalPreviousMutualTransactions} times) between two users. Highly indicative of point-farming.`;
    }
    // Check similar names/emails
    else if (
      requesterInfo.email.toLowerCase().replace(/\+.*@/, '@') === donorInfo.email.toLowerCase().replace(/\+.*@/, '@') ||
      (requesterInfo.name.toLowerCase() === donorInfo.name.toLowerCase())
    ) {
      isFraudulent = true;
      confidence = 85;
      reason = 'Abuse Detected: Requester and donor appear to use identical or linked accounts (matching email aliases or identical names).';
    }

    return { isFraudulent, confidence, reason };
  }

  // 4. Run real Gemini AI API collusion check
  try {
    const prompt = `
You are an AI trust and fraud prevention model for a blood coordination network called BloodBridge.
Your job is to analyze the transaction history and profile details between a requester and a donor to detect collusive point-farming, badges boosting, or duplicate/sockpuppet account abuse.

Details to analyze:
${JSON.stringify(analysisContext, null, 2)}

Instructions:
1. Flag as fraudulent (isFraudulent: true) if:
   - Requester and donor have extremely similar names, emails, or appear to be the same person trying to farm reward points.
   - The mutual exchanges between these two specific accounts are unusually high (e.g. repeated accepts back-and-forth).
   - The verification comments or details suggest they are fake or collusive.
2. Return your output strictly as a JSON object with this shape:
{
  "isFraudulent": boolean,
  "confidence": number (between 0 and 100),
  "reason": "a brief detailed explanation of why it was flagged or approved"
}
Do not write anything else. Just the JSON object.
`;

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json"
      }
    };

    console.log(`Sending collusion check to Gemini API for requester ${requester.email} and donor ${donor.email}...`);
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API returned status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!resultText) {
      throw new Error('Empty response from Gemini AI.');
    }

    const parsedResult = JSON.parse(resultText.trim());
    console.log('Gemini AI Collusion Check result:', parsedResult);
    
    return {
      isFraudulent: !!parsedResult.isFraudulent,
      confidence: Number(parsedResult.confidence) || 0,
      reason: parsedResult.reason || 'AI Check completed.'
    };
  } catch (apiError) {
    console.error('Gemini AI collusion check failed. Falling back to rule-based analysis...', apiError.message);
    
    // Final emergency fallback (rule-based)
    let isFraudulent = false;
    let confidence = 0;
    let reason = 'Normal activity (Rule Fallback).';

    if (requesterInfo.id === donorInfo.id) {
      isFraudulent = true;
      confidence = 100;
      reason = 'Abuse Detected: User cannot donate to their own request.';
    } else if (analysisContext.history.totalPreviousMutualTransactions >= 3) {
      isFraudulent = true;
      confidence = 90;
      reason = `Abuse Fallback: High mutual donation frequency detected (${analysisContext.history.totalPreviousMutualTransactions} times).`;
    }
    
    return { isFraudulent, confidence, reason };
  }
};

/**
 * Checks a text description of chronic health conditions to determine if they prevent blood donation.
 * Uses Gemini AI if GEMINI_API_KEY is present, otherwise falls back to keyword-based regex rules.
 * 
 * @param {String} text - The free text description of health issues
 * @returns {Promise<Object>} - { hasIssues: boolean, reason: string }
 */
const checkMedicalEligibility = async (text) => {
  if (!text || !text.trim()) {
    return { hasIssues: false, reason: 'No health conditions specified.' };
  }

  const apiKey = process.env.GEMINI_API_KEY;

  // 1. Fallback keyword-based check if API key is missing
  if (!apiKey) {
    console.log('Gemini API key is not present. Executing keyword-based medical eligibility check...');
    
    // Disqualifying keywords/patterns (case-insensitive)
    const redFlags = [
      /\bhiv\b/i, /\baids\b/i, /sugar/i, /diabet/i, /cancer/i, /tumor/i, 
      /hepatitis/i, /syphilis/i, /kidney/i, /renal/i, /heart/i, /cardiac/i,
      /tuberculosis/i, /\btb\b/i, /asthma/i, /insulin/i, /epilepsy/i,
      /anemia/i, /pregnant/i, /breastfeed/i, /stroke/i, /hypertension/i, /bp/i
    ];

    const matched = [];
    for (const flag of redFlags) {
      if (flag.test(text)) {
        matched.push(flag.source.replace(/\\b/g, '').replace(/\/i/g, ''));
      }
    }

    if (matched.length > 0) {
      return { 
        hasIssues: true, 
        reason: `Potential chronic condition(s) detected via rule matching: [${matched.join(', ')}].`
      };
    }

    return { hasIssues: false, reason: 'No high-risk keywords matched.' };
  }

  // 2. Gemini AI Check
  try {
    const prompt = `
You are a medical screening assistant for a blood bank donation platform called BloodBridge.
Your task is to analyze the free text description of a user's health issues and determine if any of the mentioned conditions disqualify them from donating blood according to general medical standards (e.g. WHO/Red Cross guidelines).

General disqualifiers include:
- Chronic diseases (HIV/AIDS, diabetes/sugar on insulin, hepatitis, active tuberculosis, chronic kidney diseases, heart failure, epilepsy, active cancers).
- High risk states (pregnancy, breastfeeding, active severe asthma, severe hypertension/anemia).

Health Details text to analyze:
"${text}"

Instructions:
1. Set "hasIssues": true if the text describes any chronic or active medical conditions that would disqualify them from donating blood.
2. Return your output strictly as a JSON object with this shape:
{
  "hasIssues": boolean,
  "reason": "a brief clear medical reason explaining why the user is disqualified or approved"
}
Do not write anything else. Just the JSON object.
`;

    const requestBody = {
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json"
      }
    };

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API returned status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!resultText) {
      throw new Error('Empty response from Gemini.');
    }

    const parsedResult = JSON.parse(resultText.trim());
    console.log('Gemini Medical Eligibility check result:', parsedResult);

    return {
      hasIssues: !!parsedResult.hasIssues,
      reason: parsedResult.reason || 'Medical check completed.'
    };
  } catch (error) {
    console.error('Gemini medical check failed. Falling back to rule-based analysis...', error.message);
    
    // Fallback search
    const redFlags = [
      /\bhiv\b/i, /\baids\b/i, /sugar/i, /diabet/i, /cancer/i, /tumor/i, 
      /hepatitis/i, /syphilis/i, /kidney/i, /renal/i, /heart/i, /cardiac/i,
      /tuberculosis/i, /\btb\b/i, /asthma/i, /insulin/i, /epilepsy/i,
      /anemia/i, /pregnant/i, /breastfeed/i, /stroke/i, /hypertension/i, /bp/i
    ];

    const matched = [];
    for (const flag of redFlags) {
      if (flag.test(text)) {
        matched.push(flag.source.replace(/\\b/g, '').replace(/\/i/g, ''));
      }
    }

    if (matched.length > 0) {
      return { 
        hasIssues: true, 
        reason: `Potential chronic condition(s) detected via fallback: [${matched.join(', ')}].`
      };
    }

    return { hasIssues: false, reason: 'Clean fallback check.' };
  }
};

module.exports = {
  checkCollusion,
  checkMedicalEligibility
};

