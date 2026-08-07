import axios from 'axios';
import { logger } from '../utils/logger';

const PINATA_API_URL = 'https://api.pinata.cloud';

/**
 * Test Pinata authentication
 */
export async function testPinataAuth(): Promise<boolean> {
  const PINATA_JWT = process.env.PINATA_JWT;
  if (!PINATA_JWT) {
    return false;
  }

  try {
    const response = await axios.get(
      `${PINATA_API_URL}/data/testAuthentication`,
      {
        headers: {
          'Authorization': `Bearer ${PINATA_JWT}`,
        },
      }
    );

    return response.data.message === 'Congratulations! You are communicating with the Pinata API!';
  } catch (error) {
    logger.error('Pinata auth test failed', { error });
    return false;
  }
}
