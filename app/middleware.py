import json
from django.utils.deprecation import MiddlewareMixin

class RequestLoggerMiddleware(MiddlewareMixin):
    """
    Logs ALL requests to find where submit is really going
    """
    
    def process_request(self, request):
        if 'submit' in request.path:
            print("\n" + "🔍"*40)
            print("🔍 MIDDLEWARE CAUGHT SUBMIT REQUEST!")
            print("🔍"*40)
            print(f"Path: {request.path}")
            print(f"Method: {request.method}")
            print(f"User: {request.user}")
            print(f"View function: {request.resolver_match.func if hasattr(request, 'resolver_match') and request.resolver_match else 'Unknown'}")
            print(f"View name: {request.resolver_match.view_name if hasattr(request, 'resolver_match') and request.resolver_match else 'Unknown'}")
            
            if request.body:
                try:
                    body = json.loads(request.body)
                    print(f"Body: {body}")
                except:
                    print(f"Body (raw): {request.body[:200]}")
            
            print("🔍"*40 + "\n")
        
        return None
    
    def process_response(self, request, response):
        if 'submit' in request.path:
            print("\n" + "📤"*40)
            print("📤 MIDDLEWARE CAUGHT SUBMIT RESPONSE!")
            print("📤"*40)
            print(f"Status: {response.status_code}")
            print(f"Content length: {len(response.content)} bytes")
            
            try:
                content = json.loads(response.content)
                print(f"Response: {content}")
            except:
                print(f"Response (raw): {response.content[:200]}")
            
            print("📤"*40 + "\n")
        
        return response