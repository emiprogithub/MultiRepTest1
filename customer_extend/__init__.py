from . import models
def version_check(cr):
	res_module=cr.execute("delete from ir_model_fields where id not in (select res_id from ir_model_data where model='ir.model.fields')")
	return res_module