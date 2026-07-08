import { Request, Response } from "express";
import { createCheckoutSession } from "./billing.service";

export const createCheckout = async (req: Request, res: Response) => {
  try {
    console.log('Request body:', req.body);
    const { plan } = req.body;
    console.log('Extracted plan:', plan);
    
    // Validate plan
    if (!plan || !['free', 'pro', 'enterprise'].includes(plan)) {
      console.log('Plan validation failed. Plan:', plan);
      return res.status(400).json({
        message: 'Invalid plan selected'
      });
    }
    
    console.log('Plan validation passed:', plan);
    
    // For now, return a mock session URL for free plans
    // In production, this would create a real Stripe session
    if (plan === 'free') {
      res.json({
        url: null,
        message: 'Free plan activated'
      });
      return;
    }
    
    // For paid plans, create Stripe session
    const session = await createCheckoutSession();

    res.json({
      url: session.url,
    });
  } catch (error: any) {
    console.log('Error in createCheckout:', error);
    res.status(400).json({
      message: error.message,
    });
  }
};