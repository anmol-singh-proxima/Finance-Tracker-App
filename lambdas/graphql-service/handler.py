"""
AWS Lambda handler for GraphQL Finance Tracker API
"""
import json
import os
from dotenv import load_dotenv
from schema import schema
import logging

load_dotenv()

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def lambda_handler(event, context):
    """
    AWS Lambda handler for GraphQL requests
    
    Args:
        event: Lambda invocation event from API Gateway
        context: Lambda context object
        
    Returns:
        dict: Response with statusCode and body
    """
    try:
        # Parse the request
        if 'body' in event:
            body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
        else:
            body = event

        query = body.get('query')
        variables = body.get('variables', {})
        operation_name = body.get('operationName')

        if not query:
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'success': False,
                    'error': 'GraphQL query is required'
                })
            }

        # Extract user info from event headers or context
        user_id = extract_user_id(event, context)
        
        # Add user context to variables
        context_value = {
            'user_id': user_id,
            'headers': event.get('headers', {})
        }

        # Execute GraphQL query
        result = schema.execute_sync(
            query,
            variable_values=variables,
            operation_name=operation_name,
            context_value=context_value
        )

        # Prepare response
        response_data = {
            'data': result.data,
        }

        if result.errors:
            response_data['errors'] = [
                {
                    'message': str(error),
                    'locations': getattr(error, 'locations', None),
                    'path': getattr(error, 'path', None),
                }
                for error in result.errors
            ]

        logger.info(f'GraphQL query executed successfully for user {user_id}')

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': os.getenv('ALLOWED_DOMAIN', '*'),
            },
            'body': json.dumps({
                'success': True,
                'data': response_data
            })
        }

    except Exception as e:
        logger.error(f'Error in GraphQL handler: {str(e)}')
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
            },
            'body': json.dumps({
                'success': False,
                'error': 'Internal server error',
                'details': str(e) if os.getenv('NODE_ENV') == 'development' else None
            })
        }


def extract_user_id(event, context):
    """
    Extract user ID from authorization header or context
    
    Args:
        event: Lambda event
        context: Lambda context
        
    Returns:
        str: User ID or None
    """
    # Try to get from Authorization header
    headers = event.get('headers', {})
    auth_header = headers.get('Authorization') or headers.get('authorization')
    
    if auth_header and auth_header.startswith('Bearer '):
        # In a real implementation, verify JWT token
        token = auth_header.split(' ')[1]
        # TODO: Verify and decode JWT token
        return extract_user_from_token(token)
    
    # Try to get from request context (if called from API Gateway)
    if 'requestContext' in event:
        authorizer = event['requestContext'].get('authorizer', {})
        return authorizer.get('userId')
    
    return None


def extract_user_from_token(token):
    """
    Extract user ID from JWT token
    
    Args:
        token: JWT token
        
    Returns:
        str: User ID or None
    """
    # TODO: Implement JWT verification
    # For now, return a placeholder
    return 'user_placeholder'
