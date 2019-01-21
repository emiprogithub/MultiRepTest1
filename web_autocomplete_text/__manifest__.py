# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

{
    'name': 'Web Autocomplete Textbox',
    'description': "Get suggestion of a values.",
    'category':'Web',
    'depends': ['web','base_setup'],
    'summary':'Get suggestion of a values.',
    'website':'www.emiprotechnologies.com',
    'author':'Emipro Technologies (P) Ltd.',
    'version':'1.0',
    'data': [
        'views/autocomplete_text_templates.xml',
    ],
    'qweb': [
        'static/src/xml/autocomplete_text.xml'
    ],
    'installable':True,
    'auto_install':False,
    'application':False,
}
