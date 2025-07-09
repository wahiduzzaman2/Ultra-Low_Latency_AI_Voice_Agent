class FormTool:
    def __init__(self):
        self.active_form = None
        self.form_data = {}
    
    def handle_command(self, command: str) -> dict:
        command = command.lower()
        
        if "fill a form" in command:
            self.active_form = "default"
            self.form_data = {}
            return {"action": "open_form", "form": "default"}
        
        elif self.active_form:
            if "name is" in command:
                name = command.split("name is")[1].strip()
                self.form_data["name"] = name
                return {"action": "update_field", "field": "name", "value": name}
            
            elif "email is" in command:
                email = command.split("email is")[1].strip()
                self.form_data["email"] = email
                return {"action": "update_field", "field": "email", "value": email}
            
            elif "submit" in command:
                result = {"action": "submit_form", "data": self.form_data}
                self.active_form = None
                self.form_data = {}
                return result
        
        return {"action": "noop"}