from EEMSBasePackage import EEMSProgram


class EEMS3DParser(object):
    """ A parser for EEMS program files. Returns a JSON object. Adapted from EEMSTwoFileParser, Mike Lundin."""
    def __init__(self, eems_file_path):

        self.eems_file_path = eems_file_path

    def get_model(self):

        command_model = {'nodes': {}}

        program = EEMSProgram(self.eems_file_path)
        for eems_command in program.orderedCmds:
            command_name = eems_command.GetCommandName()

            if eems_command.IsReadCmd():
                if eems_command.HasParam('NewFieldName'):
                    attribute_name = eems_command.GetParam('NewFieldName')
                else:
                    attribute_name = eems_command.GetParam('InFieldName')
            else:
                attribute_name = eems_command.GetResultName()

            # Skip CSVIndex Commands. These are special commands used by EEMS, but not shown in the model.
            if attribute_name == 'CSVIndex':
                continue

            command_entry = {
                'raw_operation': command_name,
                'operation': eems_command.GetReadableNm(),
                'is_fuzzy': eems_command.GetRtrnType() == 'Fuzzy',
                'short_desc': eems_command.GetShortDesc()
            }

            # The CallExtern command's return type is not known by default. It is determined by what is being run
            # externally. Need to get the fuzzy property based on its ResultType parameter.
            if command_name == 'CALLEXTERN':
                command_entry['is_fuzzy'] = eems_command.GetParam('ResultType').lower() == 'fuzzy'

            if not eems_command.IsReadCmd():
                if 'InFieldNames' in eems_command.GetRequiredParamNames():
                    command_entry['children'] = eems_command.GetParam('InFieldNames')
                else:
                    command_entry['children'] = [eems_command.GetParam('InFieldName')]

            command_entry['arguments'] = []
            for param_name in eems_command.GetParamNames():
                if param_name not in ['InFileName', 'OutFileName', 'InFieldNames', 'InFieldName']:
                    param_value = eems_command.GetParam(param_name)
                    if type(param_value) is list:
                        param_str = ', '.join(str(x) for x in param_value)
                    else:
                        param_str = str(param_value)
                    command_entry['arguments'].append('{0}: {1}'.format(param_name, param_str))
            if len(command_entry['arguments']) == 0:
                command_entry.pop('arguments', None)

            command_model['nodes'][attribute_name] = command_entry

        return command_model